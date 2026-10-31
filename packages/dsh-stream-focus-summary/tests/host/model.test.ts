import { describe, expect, it } from 'vitest'
import { createHarness, streamOf, textResponse } from './harness.ts'

const REQUEST = { text: 'inspecting the plugin slot definitions', mode: 'paragraph' as const, locale: 'en' }

describe('model resolution', () => {
  it('prefers the Session pending selection over lastUsed', async () => {
    const harness = await createHarness({
      sessions: { session: null },
      handler: () => streamOf(textResponse('checked the plugin slots')),
    })
    const session = harness.sessions.get('session')!
    session.append('request/header', { header: { config: { provider: 'last', model: 'used' } }, reason: 'initial' })
    session.append('model/selection', { provider: 'pending', model: 'chosen' })

    expect(await harness.service.modelStatus('session')).toMatchObject({
      active: { provider: 'pending', model: 'chosen' },
      activeSource: 'session',
      effective: { provider: 'pending', model: 'chosen' },
    })
    await harness.service.summarize({ ...REQUEST, sessionId: 'session' })
    expect(harness.calls).toHaveLength(1)
    expect(harness.calls[0]).toMatchObject({ provider: 'pending', model: 'chosen' })
  })

  it('uses lastUsed when no pending selection exists', async () => {
    const harness = await createHarness({
      sessions: { session: null },
      handler: () => streamOf(textResponse('checked the plugin slots')),
    })
    harness.sessions.get('session')!.append('request/header', {
      header: { config: { provider: 'last', model: 'used' } },
      reason: 'initial',
    })

    expect((await harness.service.modelStatus('session')).active).toEqual({ provider: 'last', model: 'used' })
    await harness.service.summarize({ ...REQUEST, sessionId: 'session' })
    expect(harness.calls[0]).toMatchObject({ provider: 'last', model: 'used' })
  })

  it('falls back to the default model when the projection service is absent', async () => {
    const harness = await createHarness({
      sessions: { session: { provider: 'session', model: 'ignored' } },
      projections: false,
      defaultModel: { provider: 'default', model: 'fallback' },
      handler: () => streamOf(textResponse('checked the plugin slots')),
    })

    expect(await harness.service.modelStatus('session')).toMatchObject({
      active: { provider: 'default', model: 'fallback' },
      activeSource: 'default',
    })
    await harness.service.summarize({ ...REQUEST, sessionId: 'session' })
    expect(harness.calls[0]).toMatchObject({ provider: 'default', model: 'fallback' })
  })

  it('uses the default model when no Session id is supplied', async () => {
    const harness = await createHarness({
      defaultModel: { provider: 'default', model: 'fallback' },
      handler: () => streamOf(textResponse('checked the plugin slots')),
    })

    expect(await harness.service.modelStatus()).toMatchObject({
      active: { provider: 'default', model: 'fallback' },
      activeSource: 'default',
    })
    await harness.service.summarize(REQUEST)
    expect(harness.calls[0]).toMatchObject({ provider: 'default', model: 'fallback' })
  })

  it('rejects an empty reasoning request without calling a model', async () => {
    const harness = await createHarness({
      defaultModel: { provider: 'default', model: 'fallback' },
    })

    await expect(harness.service.summarize({ ...REQUEST, text: '   ' })).rejects.toThrow(/invalid summary request/)
    expect(harness.calls).toHaveLength(0)
  })

  it('makes no model call when neither Session nor default resolution exists', async () => {
    const harness = await createHarness()

    expect(await harness.service.modelStatus('missing')).toMatchObject({
      active: null,
      activeSource: 'none',
      effective: null,
    })
    await expect(harness.service.summarize({ ...REQUEST, sessionId: 'missing' }))
      .rejects.toThrow(/no model is available/)
    expect(harness.calls).toHaveLength(0)
  })
})
