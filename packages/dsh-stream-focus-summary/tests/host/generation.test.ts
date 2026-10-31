import { describe, expect, it } from 'vitest'
import { createHarness, streamOf, textResponse } from './harness.ts'

const OVERRIDE = { provider: 'test-provider', model: 'test-model' }
const REQUEST = { text: 'inspecting the plugin slot definitions', mode: 'paragraph' as const, locale: 'en' }

describe('summary generation', () => {
  it('requests one plain-text completion with locale, mode, bounds, and no purpose', async () => {
    const harness = await createHarness({
      config: { modelOverride: OVERRIDE, maxChars: 40, maxTokens: 512 },
    })
    await harness.service.summarize(REQUEST)

    const options = harness.calls[0]!
    expect(options).toMatchObject({
      provider: 'test-provider',
      model: 'test-model',
      temperature: 0.2,
      maxTokens: 512,
      stop: ['\n'],
    })
    expect(options.purpose).toBeUndefined()
    expect(options.system).toContain('locale "en"')
    expect(options.system).toContain('untrusted data')
    expect(options.messages[0]?.role).toBe('user')
    expect(options.messages[0]?.content[0]).toMatchObject({ type: 'text' })
    expect(options.messages[0]?.content[0]).toHaveProperty('text', expect.stringContaining('Reasoning:'))
  })

  it('cleans wrapping quotes, whitespace, bullets, and trailing punctuation', async () => {
    const harness = await createHarness({
      config: { modelOverride: OVERRIDE },
      handler: () => streamOf(textResponse('  - "  Check   the configuration.  "  ')),
    })
    await expect(harness.service.summarize(REQUEST)).resolves.toMatchObject({
      phrase: 'Check the configuration',
    })
  })

  it('clamps the cleaned phrase to maxChars', async () => {
    const harness = await createHarness({
      config: { modelOverride: OVERRIDE, maxChars: 10 },
      handler: () => streamOf(textResponse('a phrase that is much longer than ten characters')),
    })
    const reply = await harness.service.summarize(REQUEST)
    expect(reply.phrase).toBe('a phrase t')
    expect(reply.phrase.length).toBe(10)
  })

  it.each([
    ['multiline output', 'first line\nsecond line'],
    ['JSON output', '{"phrase":"checking the work"}'],
    ['code-fence output', '```text\nchecking the work\n```'],
    ['label-prefixed output', 'Phrase: checking the work'],
    ['mechanical copy', 'inspecting the plugin slot definitions'],
  ])('repairs once after %s', async (_name, invalid) => {
    let call = 0
    const harness = await createHarness({
      config: { modelOverride: OVERRIDE },
      handler: () => streamOf(textResponse(call++ === 0 ? invalid : 'checked the slot definitions')),
    })

    const reply = await harness.service.summarize(REQUEST)
    expect(reply.phrase).toBe('checked the slot definitions')
    expect(harness.calls).toHaveLength(2)
  })

  it('repairs once after an empty response', async () => {
    let call = 0
    const harness = await createHarness({
      config: { modelOverride: OVERRIDE },
      handler: () => streamOf(textResponse(call++ === 0 ? '   ' : 'checked the slot definitions')),
    })

    await expect(harness.service.summarize(REQUEST)).resolves.toMatchObject({ phrase: 'checked the slot definitions' })
    expect(harness.calls).toHaveLength(2)
  })

  it('fails after one repair when both attempts are unusable, and stores nothing', async () => {
    const harness = await createHarness({
      config: { modelOverride: OVERRIDE },
      handler: () => streamOf(textResponse('Phrase: still unusable')),
    })

    await expect(harness.service.summarize(REQUEST)).rejects.toThrow(/no usable phrase/)
    expect(harness.calls).toHaveLength(2)
    expect(await harness.service.phrases([{ id: 'miss', ...REQUEST }])).toEqual([])
  })

  it('does not repair a valid first response', async () => {
    const harness = await createHarness({
      config: { modelOverride: OVERRIDE },
      handler: () => streamOf(textResponse('checked the slot definitions')),
    })
    await harness.service.summarize(REQUEST)
    expect(harness.calls).toHaveLength(1)
  })

  it('forwards caller cancellation to the generation stream', async () => {
    const controller = new AbortController()
    const harness = await createHarness({
      config: { modelOverride: OVERRIDE },
      handler: () => streamOf(textResponse('checked the slot definitions')),
    })

    await harness.service.summarize(REQUEST, controller.signal)
    expect(harness.calls[0]?.signal).toBe(controller.signal)
  })

  it('does not generate when the caller is already cancelled', async () => {
    const controller = new AbortController()
    controller.abort()
    const harness = await createHarness({
      config: { modelOverride: OVERRIDE },
    })

    await expect(harness.service.summarize(REQUEST, controller.signal)).rejects.toThrow()
    expect(harness.calls).toHaveLength(0)
  })
})
