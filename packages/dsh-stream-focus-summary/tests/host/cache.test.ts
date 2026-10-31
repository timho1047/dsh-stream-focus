import { describe, expect, it } from 'vitest'
import type { SummaryRequest } from '../../src/shared/protocol.ts'
import { createHarness, streamOf, textResponse } from './harness.ts'

const OVERRIDE = { provider: 'test-provider', model: 'test-model' }
const REQUEST: SummaryRequest = {
  text: 'inspecting the plugin slot definitions',
  mode: 'paragraph',
  locale: 'en',
}

describe('summary cache', () => {
  it('serves the second identical request from the exact cache', async () => {
    let generated = 0
    const harness = await createHarness({
      config: { modelOverride: OVERRIDE },
      handler: () => streamOf(textResponse(`checked the slot definitions ${++generated}`)),
    })

    const first = await harness.service.summarize(REQUEST)
    const second = await harness.service.summarize(REQUEST)
    expect(second).toEqual(first)
    expect(harness.calls).toHaveLength(1)
  })

  it('deduplicates concurrent requests for the same exact key', async () => {
    let release!: () => void
    const gate = new Promise<void>((resolve) => { release = resolve })
    const harness = await createHarness({
      config: { modelOverride: OVERRIDE },
      handler: () => (async function* () {
        await gate
        yield { type: 'text-delta', index: 0, text: 'checked the slot definitions' } as const
        yield { type: 'finish', reason: { kind: 'stop' } } as const
      })(),
    })

    const first = harness.service.summarize(REQUEST)
    const second = harness.service.summarize(REQUEST)
    expect(harness.calls).toHaveLength(1)
    release()
    const [left, right] = await Promise.all([first, second])
    expect(left).toEqual(right)
    expect(harness.calls).toHaveLength(1)
  })

  it('evicts the least recently used memory entry beyond the internal cap', async () => {
    let generated = 0
    const harness = await createHarness({
      config: { modelOverride: OVERRIDE },
      handler: () => streamOf(textResponse(`completed step ${++generated}`)),
    })

    const requestFor = (index: number): SummaryRequest => ({
      text: `reasoning input ${index}`,
      mode: 'paragraph',
      locale: 'en',
    })
    for (let index = 0; index <= 400; index++) await harness.service.summarize(requestFor(index))

    expect(await harness.service.phrases([{ id: 'cold', ...requestFor(0) }])).toEqual([])
    expect(await harness.service.phrases([{ id: 'hot', ...requestFor(400) }])).toHaveLength(1)
  })

  it('caps concurrent uncached generations and releases the slot afterwards', async () => {
    let release!: () => void
    const gate = new Promise<void>((resolve) => { release = resolve })
    let generated = 0
    const harness = await createHarness({
      config: { modelOverride: OVERRIDE },
      handler: () => (async function* () {
        await gate
        yield { type: 'text-delta', index: 0, text: `checked concurrent ${++generated}` } as const
        yield { type: 'finish', reason: { kind: 'stop' } } as const
      })(),
    })

    const requestFor = (index: number): SummaryRequest => ({
      text: `concurrent input ${index}`,
      mode: 'paragraph',
      locale: 'en',
    })
    const pending = Array.from({ length: 8 }, (_, index) => harness.service.summarize(requestFor(index)))
    expect(harness.calls).toHaveLength(8)

    await expect(harness.service.summarize(requestFor(8))).rejects.toThrow(/too many concurrent summaries/)
    release()
    await Promise.all(pending)

    await expect(harness.service.summarize(requestFor(9))).resolves.toMatchObject({ phrase: expect.stringContaining('checked concurrent') })
  })

  it('caps phrase hydration batches at 64 queries', async () => {
    let generated = 0
    const harness = await createHarness({
      config: { modelOverride: OVERRIDE },
      handler: () => streamOf(textResponse(`checked batch ${++generated}`)),
    })
    const requestFor = (index: number): SummaryRequest => ({
      text: `batch reasoning input ${index}`,
      mode: 'paragraph',
      locale: 'en',
    })
    for (let index = 0; index < 65; index++) await harness.service.summarize(requestFor(index))

    const hits = await harness.service.phrases(
      Array.from({ length: 65 }, (_, index) => ({ id: String(index), ...requestFor(index) })),
    )
    expect(hits).toHaveLength(64)
    expect(hits.at(-1)?.id).toBe('63')
  })
})
