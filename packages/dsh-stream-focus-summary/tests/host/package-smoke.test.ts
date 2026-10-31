import { describe, expect, it } from 'vitest'
import SummaryService, { Config } from '../../src/index.ts'
import type { SummaryRequest } from '../../src/shared/protocol.ts'

describe('summary package skeleton', () => {
  it('exports the Host service and a schema with the public defaults', () => {
    expect(SummaryService).toBeTypeOf('function')
    const config = Config({})
    expect(config.maxChars.get()).toBe(30)
    expect(config.maxTokens.get()).toBe(800)
    expect(config.modelOverride.get()).toBeUndefined()
    const request: SummaryRequest = { text: 'reasoning', mode: 'paragraph', locale: 'en' }
    expect(request.mode).toBe('paragraph')
  })
})
