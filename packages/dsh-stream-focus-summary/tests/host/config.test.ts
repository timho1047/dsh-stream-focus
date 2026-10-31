import { describe, expect, it } from 'vitest'
import { Config } from '../../src/index.ts'
import type { SummaryConfig } from '../../src/shared/protocol.ts'

function resolve(input: Partial<SummaryConfig>) {
  const value = Config(input)
  return {
    maxChars: value.maxChars.get(),
    maxTokens: value.maxTokens.get(),
    modelOverride: value.modelOverride.get(),
  }
}

describe('streamFocusSummary config', () => {
  it('applies the documented defaults through live references', () => {
    expect(resolve({})).toEqual({ maxChars: 30, maxTokens: 800, modelOverride: undefined })
  })

  it('accepts the inclusive numeric bounds', () => {
    expect(resolve({ maxChars: 10, maxTokens: 256 })).toMatchObject({ maxChars: 10, maxTokens: 256 })
    expect(resolve({ maxChars: 80, maxTokens: 4000 })).toMatchObject({ maxChars: 80, maxTokens: 4000 })
  })

  it('rejects out-of-range and non-integer numeric values', () => {
    expect(() => resolve({ maxChars: 9 })).toThrow()
    expect(() => resolve({ maxChars: 81 })).toThrow()
    expect(() => resolve({ maxChars: 20.5 })).toThrow()
    expect(() => resolve({ maxTokens: 255 })).toThrow()
    expect(() => resolve({ maxTokens: 4001 })).toThrow()
  })

  it('accepts only a complete, non-empty model override', () => {
    expect(resolve({
      modelOverride: { provider: 'deepseek-official', model: 'deepseek-v4-flash' },
    }).modelOverride).toEqual({ provider: 'deepseek-official', model: 'deepseek-v4-flash' })

    expect(() => resolve({
      modelOverride: { provider: 'deepseek-official' } as never,
    })).toThrow()
    expect(() => resolve({
      modelOverride: { model: 'deepseek-v4-flash' } as never,
    })).toThrow()
    expect(() => resolve({
      modelOverride: { provider: '', model: 'deepseek-v4-flash' },
    })).toThrow()
    expect(() => resolve({
      modelOverride: { provider: 'deepseek-official', model: '' },
    })).toThrow()
    expect(() => resolve({
      modelOverride: { provider: '   ', model: 'deepseek-v4-flash' },
    })).toThrow()
  })
})
