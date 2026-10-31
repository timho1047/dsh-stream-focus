import { onTestFinished, describe, expect, it, vi } from 'vitest'
import type { GenerateOptions, StreamChunk } from '@deepseek-ai/dsh-llm'
import type { ModelRef, SummaryRequest } from '../../src/shared/protocol.ts'
import {
  createHarness,
  errorResponse,
  partialErrorResponse,
  streamOf,
  textResponse,
  type LlmHandler,
} from './harness.ts'

const OVERRIDE: ModelRef = { provider: 'ghost', model: 'missing-model' }
const SESSION_MODEL: ModelRef = { provider: 'session', model: 'session-model' }
const REQUEST: SummaryRequest = {
  text: 'inspecting the plugin slot definitions',
  mode: 'paragraph',
  locale: 'en',
}

function routedHandler(
  overrideResponse: (options: GenerateOptions) => readonly StreamChunk[],
  sessionResponse: () => readonly StreamChunk[] = () => textResponse('checked with the session model'),
): LlmHandler {
  return (options) => streamOf(options.provider === OVERRIDE.provider
    ? overrideResponse(options)
    : sessionResponse())
}

describe('override fallback policy', () => {
  it('falls back to the Session model before usable text and reports diagnostics', async () => {
    const harness = await createHarness({
      config: { modelOverride: OVERRIDE },
      sessions: { session: SESSION_MODEL },
      handler: routedHandler(() => errorResponse('UNKNOWN_MODEL')),
    })

    const reply = await harness.service.summarize({ ...REQUEST, sessionId: 'session' })
    expect(reply.phrase).toBe('checked with the session model')
    expect(reply.key.split(':').slice(0, 4)).toEqual(['v1', '1', 'session', 'session-model'])
    expect(harness.calls.map(call => call.provider)).toEqual(['ghost', 'session'])

    const status = await harness.service.modelStatus('session')
    expect(status).toMatchObject({
      active: SESSION_MODEL,
      activeSource: 'session',
      override: OVERRIDE,
      effective: SESSION_MODEL,
      lastFallback: {
        from: OVERRIDE,
        to: SESSION_MODEL,
        reason: 'UNKNOWN_MODEL',
      },
    })
    expect(status.lastFallback?.at).toBeTypeOf('number')

    await harness.service.summarize({ ...REQUEST, sessionId: 'session' })
    expect(harness.calls).toHaveLength(2)
  })

  it('falls back to the default model when no Session model exists', async () => {
    const DEFAULT: ModelRef = { provider: 'default', model: 'default-model' }
    const harness = await createHarness({
      config: { modelOverride: OVERRIDE },
      defaultModel: DEFAULT,
      handler: routedHandler(() => errorResponse('NO_ADAPTER'), () => textResponse('checked with the default model')),
    })

    await harness.service.summarize(REQUEST)
    expect(harness.calls.map(call => call.provider)).toEqual(['ghost', 'default'])
    expect(await harness.service.modelStatus()).toMatchObject({
      active: DEFAULT,
      activeSource: 'default',
      effective: DEFAULT,
      lastFallback: { from: OVERRIDE, to: DEFAULT, reason: 'NO_ADAPTER' },
    })
  })

  it('does not fall back when neither Session nor default model exists', async () => {
    const harness = await createHarness({
      config: { modelOverride: OVERRIDE },
      handler: routedHandler(() => errorResponse('UNKNOWN_MODEL')),
    })

    await expect(harness.service.summarize(REQUEST)).rejects.toThrow(/no model is available|generation failed/)
    expect(harness.calls).toHaveLength(1)
    expect(await harness.service.modelStatus()).toMatchObject({
      active: null,
      activeSource: 'none',
      override: OVERRIDE,
      effective: null,
    })
    expect((await harness.service.modelStatus()).lastFallback).toBeUndefined()
  })

  it.each([
    'UNKNOWN_MODEL',
    'NO_ADAPTER',
    'AUTH',
    'MISSING_CREDENTIAL',
    'INVALID_CREDENTIAL',
    'QUOTA',
    'ACCOUNT_QUOTA',
    'MODEL_NOT_FOUND',
    'INVALID_API_KEY',
  ])('falls back for terminal override code %s', async (code) => {
    const harness = await createHarness({
      config: { modelOverride: OVERRIDE },
      sessions: { session: SESSION_MODEL },
      handler: routedHandler(() => errorResponse(code)),
    })

    await expect(harness.service.summarize({ ...REQUEST, sessionId: 'session' }))
      .resolves.toMatchObject({ phrase: 'checked with the session model' })
    expect(harness.calls.map(call => call.provider)).toEqual(['ghost', 'session'])
  })

  it.each(['RATE_LIMIT', 'SERVER', 'TIMEOUT', 'TRANSPORT', 'INVALID_CATALOG'])(
    'does not fall back for transient or catalogue code %s',
    async (code) => {
      const harness = await createHarness({
        config: { modelOverride: OVERRIDE },
        sessions: { session: SESSION_MODEL },
        handler: routedHandler(() => errorResponse(code)),
      })

      await expect(harness.service.summarize({ ...REQUEST, sessionId: 'session' }))
        .rejects.toThrow(/generation failed/)
      expect(harness.calls.map(call => call.provider)).toEqual(['ghost'])
      expect((await harness.service.modelStatus('session')).lastFallback).toBeUndefined()
    },
  )

  it('does not fall back when the override fails after producing text', async () => {
    const harness = await createHarness({
      config: { modelOverride: OVERRIDE },
      sessions: { session: SESSION_MODEL },
      handler: routedHandler(() => partialErrorResponse('half a phrase', 'UNKNOWN_MODEL')),
    })

    await expect(harness.service.summarize({ ...REQUEST, sessionId: 'session' }))
      .rejects.toThrow(/generation failed/)
    expect(harness.calls.map(call => call.provider)).toEqual(['ghost'])
    expect((await harness.service.modelStatus('session')).lastFallback).toBeUndefined()
  })

  it('does not fall back when both override attempts are empty', async () => {
    const harness = await createHarness({
      config: { modelOverride: OVERRIDE },
      sessions: { session: SESSION_MODEL },
      handler: routedHandler(() => textResponse('')),
    })

    await expect(harness.service.summarize({ ...REQUEST, sessionId: 'session' }))
      .rejects.toThrow(/no usable phrase/)
    expect(harness.calls.map(call => call.provider)).toEqual(['ghost', 'ghost'])
    expect((await harness.service.modelStatus('session')).lastFallback).toBeUndefined()
  })

  it('does not fall back when the override stream is aborted', async () => {
    const harness = await createHarness({
      config: { modelOverride: OVERRIDE },
      sessions: { session: SESSION_MODEL },
      handler: routedHandler(() => [{
        type: 'finish',
        reason: { kind: 'aborted', failure: { code: 'ABORTED', message: 'cancelled' } },
      }]),
    })

    await expect(harness.service.summarize({ ...REQUEST, sessionId: 'session' }))
      .rejects.toThrow(/generation failed/)
    expect(harness.calls.map(call => call.provider)).toEqual(['ghost'])
    expect((await harness.service.modelStatus('session')).lastFallback).toBeUndefined()
  })

  it('repairs an empty override response on the same model instead of falling back', async () => {
    let ghostCalls = 0
    const harness = await createHarness({
      config: { modelOverride: OVERRIDE },
      sessions: { session: SESSION_MODEL },
      handler: routedHandler(() => {
        ghostCalls += 1
        return ghostCalls === 1 ? textResponse('') : textResponse('checked by the override')
      }),
    })

    await expect(harness.service.summarize({ ...REQUEST, sessionId: 'session' }))
      .resolves.toMatchObject({ phrase: 'checked by the override' })
    expect(harness.calls.map(call => call.provider)).toEqual(['ghost', 'ghost'])
    expect((await harness.service.modelStatus('session')).lastFallback).toBeUndefined()
  })

  it('caches terminal invalid state and clears it on credential changes', async () => {
    let failOverride = true
    const harness = await createHarness({
      config: { modelOverride: OVERRIDE },
      sessions: { session: SESSION_MODEL },
      handler: routedHandler(() => failOverride
        ? errorResponse('UNKNOWN_MODEL')
        : textResponse('checked by the override')),
    })

    await harness.service.summarize({ ...REQUEST, sessionId: 'session' })
    expect((await harness.service.modelStatus('session')).lastFallback).toBeDefined()

    await harness.service.summarize({
      ...REQUEST,
      sessionId: 'session',
      text: 'checking another source file',
    })
    expect(harness.calls.map(call => call.provider)).toEqual(['ghost', 'session', 'session'])

    failOverride = false
    harness.ctx.emit('credentials/record-updated', 'test-credential' as never)
    await harness.service.summarize({
      ...REQUEST,
      sessionId: 'session',
      text: 'checking a third source file',
    })
    expect(harness.calls.at(-1)?.provider).toBe('ghost')
    expect((await harness.service.modelStatus('session')).lastFallback).toBeUndefined()
  })

  it('clears cached override failures and fallback diagnostics on a volatile config edit', async () => {
    let failOverride = true
    const harness = await createHarness({
      config: { modelOverride: OVERRIDE },
      sessions: { session: SESSION_MODEL },
      handler: routedHandler(() => failOverride
        ? errorResponse('UNKNOWN_MODEL')
        : textResponse('checked after the config edit')),
    })

    await harness.service.summarize({ ...REQUEST, sessionId: 'session' })
    expect((await harness.service.modelStatus('session')).lastFallback).toBeDefined()

    failOverride = false
    harness.ctx.emit('loader/volatile-update', [['maxChars']])
    await harness.service.summarize({
      ...REQUEST,
      sessionId: 'session',
      text: 'checking after a volatile config edit',
    })

    expect(harness.calls.at(-1)?.provider).toBe('ghost')
    expect((await harness.service.modelStatus('session')).lastFallback).toBeUndefined()
  })

  it('expires the terminal invalid cache after the TTL', async () => {
    vi.useFakeTimers()
    onTestFinished(() => { vi.useRealTimers() })
    let failOverride = true
    const harness = await createHarness({
      config: { modelOverride: OVERRIDE },
      sessions: { session: SESSION_MODEL },
      handler: routedHandler(() => failOverride
        ? errorResponse('UNKNOWN_MODEL')
        : textResponse('checked by the override')),
    })

    await harness.service.summarize({ ...REQUEST, sessionId: 'session' })
    failOverride = false
    vi.advanceTimersByTime(60_001)

    await harness.service.summarize({
      ...REQUEST,
      sessionId: 'session',
      text: 'checking after the ttl',
    })
    expect(harness.calls.at(-1)?.provider).toBe('ghost')
    expect((await harness.service.modelStatus('session')).lastFallback).toBeUndefined()
  })

  it('clears only the changed Session fallback and keeps other Session diagnostics', async () => {
    const harness = await createHarness({
      config: { modelOverride: OVERRIDE },
      sessions: {
        first: { provider: 'session-one', model: 'one' },
        second: { provider: 'session-two', model: 'two' },
      },
      handler: (options) => streamOf(options.provider === OVERRIDE.provider
        ? errorResponse('UNKNOWN_MODEL')
        : textResponse(`checked by ${options.provider}`)),
    })

    await harness.service.summarize({ ...REQUEST, sessionId: 'first' })
    harness.ctx.emit('llm/adapters-updated')
    await harness.service.summarize({
      ...REQUEST,
      sessionId: 'second',
      text: 'checking another source file',
    })

    expect((await harness.service.modelStatus('first')).lastFallback?.to).toMatchObject({ provider: 'session-one' })
    expect((await harness.service.modelStatus('second')).lastFallback?.to).toMatchObject({ provider: 'session-two' })

    harness.sessions.get('first')!.append('model/selection', { provider: 'session-one', model: 'changed' })
    expect((await harness.service.modelStatus('first')).lastFallback).toBeUndefined()
    expect((await harness.service.modelStatus('second')).lastFallback).toBeDefined()
  })

  it('does not apply fallback policy without a configured override', async () => {
    const harness = await createHarness({
      sessions: { session: SESSION_MODEL },
      handler: () => streamOf(errorResponse('UNKNOWN_MODEL')),
    })

    await expect(harness.service.summarize({ ...REQUEST, sessionId: 'session' }))
      .rejects.toThrow(/generation failed/)
    expect(harness.calls).toHaveLength(1)
    expect((await harness.service.modelStatus('session')).lastFallback).toBeUndefined()
  })
})
