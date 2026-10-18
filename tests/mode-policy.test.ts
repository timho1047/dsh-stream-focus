import { describe, expect, it } from 'vitest'
import { conductorFor, resolveMode } from '../src/client/mode-policy.ts'

describe('resolveMode', () => {
  it('uses every current mode directly', () => {
    expect(resolveMode('compact', false)).toBe('compact')
    expect(resolveMode('standard', false)).toBe('standard')
    expect(resolveMode('detailed', false)).toBe('detailed')
    expect(resolveMode('verbose', false)).toBe('verbose')
  })

  it('maps legacy and invalid values to the client default', () => {
    expect(resolveMode('normal', false)).toBe('detailed')
    expect(resolveMode('expanded', true)).toBe('detailed')
    expect(resolveMode(null, true)).toBe('standard')
    expect(resolveMode(undefined, false)).toBe('detailed')
    expect(resolveMode('unknown', true)).toBe('standard')
  })
})

describe('conductorFor', () => {
  it('uses grouped conductors for Compact and Standard', () => {
    expect(conductorFor('compact')).toBe('grouped')
    expect(conductorFor('standard')).toBe('grouped')
  })

  it('uses flat rows for Detailed and Verbose', () => {
    expect(conductorFor('detailed')).toBe('flat')
    expect(conductorFor('verbose')).toBe('flat')
  })
})
