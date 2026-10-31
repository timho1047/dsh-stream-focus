import { describe, expect, it } from 'vitest'
import type { AnchorIdentity, SummaryRequest } from '../../src/shared/protocol.ts'
import { createHarness, streamOf, textResponse } from './harness.ts'

const OVERRIDE = { provider: 'test-provider', model: 'test-model' }
const ANCHOR: AnchorIdentity = { nodeKey: 'node-1', groupPart: 'reasoning', rowIndex: 0 }

function request(overrides: Partial<SummaryRequest> = {}): SummaryRequest {
  return {
    text: 'inspecting the plugin slot definitions',
    mode: 'paragraph',
    locale: 'en',
    ...overrides,
  }
}

describe('phrase keys', () => {
  it('derives a stable exact key from the effective route and request identity', async () => {
    const harness = await createHarness({ config: { modelOverride: OVERRIDE } })
    const reply = await harness.service.summarize(request())
    const parts = reply.key.split(':')

    expect(parts).toHaveLength(9)
    expect(parts.slice(0, 7)).toEqual(['v1', '1', 'test-provider', 'test-model', 'en', 'paragraph', '30'])
    expect(parts[7]).toMatch(/^[0-9a-f]{16}$/)
    expect(parts[8]).toMatch(/^[0-9a-f]{16}$/)

    expect((await harness.service.summarize(request())).key).toBe(reply.key)
    expect(harness.calls).toHaveLength(1)
  })

  it('changes the exact key for content and Session isolation', async () => {
    const harness = await createHarness({ config: { modelOverride: OVERRIDE } })
    const one = await harness.service.summarize(request({ sessionId: 'session-a' }))
    const otherSession = await harness.service.summarize(request({ sessionId: 'session-b' }))
    const otherContent = await harness.service.summarize(request({
      sessionId: 'session-a',
      text: 'checking a different source file',
    }))

    expect(otherSession.key).not.toBe(one.key)
    expect(otherSession.key.split(':')[7]).not.toBe(one.key.split(':')[7])
    expect(otherContent.key.split(':')[8]).not.toBe(one.key.split(':')[8])
  })

  it('encodes route components that contain key delimiters', async () => {
    const harness = await createHarness({
      config: { modelOverride: { provider: 'provider:one', model: 'model/two' } },
    })
    const reply = await harness.service.summarize(request())
    expect(reply.key.split(':').slice(0, 4)).toEqual(['v1', '1', 'provider%3Aone', 'model%2Ftwo'])
  })

  it('looks up exact first, then the locale-neutral anchor with its generated locale', async () => {
    let call = 0
    const harness = await createHarness({
      config: { modelOverride: OVERRIDE },
      handler: () => streamOf(textResponse(call++ === 0 ? 'checked the slot definitions' : 'checked the row layout')),
    })
    const generated = await harness.service.summarize(request({ anchor: ANCHOR }))

    const exact = await harness.service.phrases([{ id: 'exact', ...request({ anchor: ANCHOR }) }])
    expect(exact).toEqual([{
      id: 'exact',
      key: generated.key,
      phrase: 'checked the slot definitions',
      locale: 'en',
    }])

    const anchorHit = await harness.service.phrases([{
      id: 'anchor',
      ...request({ locale: 'fr', anchor: ANCHOR }),
    }])
    expect(anchorHit).toHaveLength(1)
    expect(anchorHit[0]?.id).toBe('anchor')
    expect(anchorHit[0]?.phrase).toBe('checked the slot definitions')
    expect(anchorHit[0]?.locale).toBe('en')
    expect(anchorHit[0]?.key).toMatch(/^a:v1:1:test-provider:test-model:paragraph:30:[0-9a-f]{16}:[0-9a-f]{16}:[0-9a-f]{16}$/)
    expect(anchorHit[0]?.key).not.toBe(generated.key)
  })

  it('keeps equal first lines on different rows in separate anchor lanes', async () => {
    let call = 0
    const harness = await createHarness({
      config: { modelOverride: OVERRIDE },
      handler: () => streamOf(textResponse(call++ === 0 ? 'checked the first row' : 'checked the second row')),
    })
    const firstText = 'shared first line\nbody for the first row'
    const secondText = 'shared first line\nbody for the second row'
    await harness.service.summarize(request({
      text: firstText,
      anchor: { nodeKey: 'node-1', groupPart: 'reasoning', rowIndex: 0 },
    }))
    await harness.service.summarize(request({
      text: secondText,
      anchor: { nodeKey: 'node-1', groupPart: 'reasoning', rowIndex: 1 },
    }))

    const first = await harness.service.phrases([{
      id: 'first',
      ...request({ text: firstText, locale: 'fr', anchor: { nodeKey: 'node-1', groupPart: 'reasoning', rowIndex: 0 } }),
    }])
    const second = await harness.service.phrases([{
      id: 'second',
      ...request({ text: secondText, locale: 'fr', anchor: { nodeKey: 'node-1', groupPart: 'reasoning', rowIndex: 1 } }),
    }])
    expect(first[0]?.key).not.toBe(second[0]?.key)
    expect(first[0]?.phrase).toBe('checked the first row')
    expect(second[0]?.phrase).toBe('checked the second row')
  })

  it('records an anchor for every row that shares one exact phrase', async () => {
    const harness = await createHarness({ config: { modelOverride: OVERRIDE } })
    const text = 'identical reasoning shown in two rows'
    const firstAnchor: AnchorIdentity = { nodeKey: 'node-1', groupPart: 'reasoning', rowIndex: 0 }
    const secondAnchor: AnchorIdentity = { nodeKey: 'node-1', groupPart: 'reasoning', rowIndex: 1 }
    await harness.service.summarize(request({ text, anchor: firstAnchor }))
    await harness.service.summarize(request({ text, anchor: secondAnchor }))
    expect(harness.calls).toHaveLength(1)

    expect(await harness.service.phrases([{ id: 'first', ...request({ text, locale: 'fr', anchor: firstAnchor }) }]))
      .toHaveLength(1)
    expect(await harness.service.phrases([{ id: 'second', ...request({ text, locale: 'fr', anchor: secondAnchor }) }]))
      .toHaveLength(1)
  })

  it('isolates anchors by Session identity', async () => {
    const harness = await createHarness({ config: { modelOverride: OVERRIDE } })
    await harness.service.summarize(request({ sessionId: 'session-a', anchor: ANCHOR }))

    expect(await harness.service.phrases([{
      id: 'other',
      ...request({ sessionId: 'session-b', locale: 'fr', anchor: ANCHOR }),
    }])).toEqual([])
  })

  it('writes only the exact key when stable row identity is absent', async () => {
    const harness = await createHarness({ config: { modelOverride: OVERRIDE } })
    await harness.service.summarize(request())

    expect(await harness.service.phrases([{ id: 'en', ...request() }])).toHaveLength(1)
    expect(await harness.service.phrases([{ id: 'fr', ...request({ locale: 'fr' }) }])).toEqual([])
  })
})
