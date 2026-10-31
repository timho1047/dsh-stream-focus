import { describe, expect, it } from 'vitest'
import type { SummaryRequest } from '../../src/shared/protocol.ts'
import { createHarness, fakeStorage, streamOf, textResponse, type TestPhrase } from './harness.ts'

const OVERRIDE = { provider: 'test-provider', model: 'test-model' }
const ANCHOR = { nodeKey: 'node-1', groupPart: 'reasoning', rowIndex: 0 as const }
const REQUEST: SummaryRequest = {
  text: 'inspecting the plugin slot definitions',
  mode: 'paragraph',
  locale: 'en',
  anchor: ANCHOR,
}

function seededRecord(index: number): TestPhrase {
  return {
    phrase: `stored phrase ${index}`,
    locale: 'en',
    promptVersion: '1',
    updatedAt: index,
  }
}

describe('phrase persistence', () => {
  it('opens the declared domain and hydrates exact and anchor hits after restart', async () => {
    const storage = fakeStorage()
    const first = await createHarness({
      config: { modelOverride: OVERRIDE },
      storage,
      handler: () => streamOf(textResponse('checked the slot definitions')),
    })
    const generated = await first.service.summarize(REQUEST)

    expect(storage.specs).toHaveLength(1)
    expect(storage.specs[0]).toMatchObject({
      name: 'stream_focus_summary',
      version: 1,
      invalidRecords: 'backup-and-skip',
    })
    expect([...storage.records.keys()]).toEqual(expect.arrayContaining([generated.key]))
    expect(storage.records.size).toBe(2)

    const second = await createHarness({
      config: { modelOverride: OVERRIDE },
      storage,
      handler: () => { throw new Error('hydrated phrases must not generate') },
    })
    expect(await second.service.phrases([{ id: 'exact', ...REQUEST }])).toEqual([{
      id: 'exact',
      key: generated.key,
      phrase: 'checked the slot definitions',
      locale: 'en',
    }])
    const anchor = await second.service.phrases([{ id: 'anchor', ...REQUEST, locale: 'fr' }])
    expect(anchor).toHaveLength(1)
    expect(anchor[0]).toMatchObject({ phrase: 'checked the slot definitions', locale: 'en' })
    expect(anchor[0]?.key).toMatch(/^a:/)

    expect(await second.service.summarize(REQUEST)).toMatchObject({ key: generated.key })
    expect(second.calls).toHaveLength(0)
  })

  it('keeps only validated phrases and never persists reasoning text', async () => {
    const storage = fakeStorage()
    const harness = await createHarness({
      config: { modelOverride: OVERRIDE },
      storage,
      handler: () => streamOf(textResponse('Phrase: unusable output')),
    })

    await expect(harness.service.summarize(REQUEST)).rejects.toThrow(/no usable phrase/)
    expect(storage.records.size).toBe(0)

    const valid = await createHarness({
      config: { modelOverride: OVERRIDE },
      storage,
      handler: () => streamOf(textResponse('checked the slot definitions')),
    })
    await valid.service.summarize(REQUEST)
    expect(JSON.stringify([...storage.records])).not.toContain(REQUEST.text)
    for (const record of storage.records.values()) {
      expect(Object.keys(record).sort()).toEqual(['locale', 'phrase', 'promptVersion', 'updatedAt'])
    }
  })

  it('degrades to memory when opening the durable domain fails', async () => {
    const storage = fakeStorage([], { open: new Error('storage backend unavailable') })
    const harness = await createHarness({
      config: { modelOverride: OVERRIDE },
      storage,
      handler: () => streamOf(textResponse('checked the slot definitions')),
    })

    const reply = await harness.service.summarize(REQUEST)
    expect(reply.phrase).toBe('checked the slot definitions')
    expect(await harness.service.phrases([{ id: 'memory', ...REQUEST }])).toEqual([{
      id: 'memory',
      key: reply.key,
      phrase: 'checked the slot definitions',
      locale: 'en',
    }])
    expect(harness.calls).toHaveLength(1)
  })

  it('degrades to memory when durable records cannot be enumerated', async () => {
    const storage = fakeStorage([], { entries: new Error('corrupt index') })
    const harness = await createHarness({
      config: { modelOverride: OVERRIDE },
      storage,
      handler: () => streamOf(textResponse('checked the slot definitions')),
    })

    await expect(harness.service.summarize(REQUEST)).resolves.toMatchObject({
      phrase: 'checked the slot definitions',
    })
    expect(harness.calls).toHaveLength(1)
  })

  it('trims the durable table to its internal cap by oldest update time', async () => {
    const seed = Array.from({ length: 805 }, (_, index) => [`record-${index}`, seededRecord(index)] as const)
    const storage = fakeStorage(seed)
    await createHarness({ config: { modelOverride: OVERRIDE }, storage })

    expect(storage.records.size).toBe(800)
    expect(storage.deleted).toEqual(expect.arrayContaining([
      'record-0', 'record-1', 'record-2', 'record-3', 'record-4',
    ]))
    expect(storage.records.has('record-805')).toBe(false)
    expect(storage.records.has('record-804')).toBe(true)
  })

  it('trims the durable table after a write that exceeds the cap', async () => {
    const seed = Array.from({ length: 800 }, (_, index) => [`record-${index}`, seededRecord(index)] as const)
    const storage = fakeStorage(seed)
    const harness = await createHarness({
      config: { modelOverride: OVERRIDE },
      storage,
      handler: () => streamOf(textResponse('checked the slot definitions')),
    })

    await harness.service.summarize({ ...REQUEST, anchor: undefined })
    expect(storage.records.size).toBe(800)
    expect(storage.records.has('record-0')).toBe(false)
    expect(storage.records.has('record-1')).toBe(true)
  })
})
