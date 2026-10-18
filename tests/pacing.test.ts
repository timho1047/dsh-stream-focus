import { describe, expect, it } from 'vitest'
import { nextFollowTop, nextRevealLength } from '../src/client/pacing.ts'

describe('nextRevealLength', () => {
  it('spreads a normal chunk over several frames', () => {
    expect(nextRevealLength(0, 'abcdefghijklmnopqrst')).toBe(4)
    expect(nextRevealLength(18, 'abcdefghijklmnopqrst')).toBe(19)
  })

  it('never reveals past the target', () => {
    expect(nextRevealLength(20, 'abcdefghijklmnopqrst')).toBe(20)
    expect(nextRevealLength(99, 'short')).toBe(5)
  })

  it('keeps combining marks attached to their base character', () => {
    const target = 'a\u0301b'
    expect(target.length).toBe(3)
    expect(nextRevealLength(0, target)).toBe(2)
  })

  it('keeps a non-BMP surrogate pair intact', () => {
    const target = 'a😀b'
    expect(target.length).toBe(4)
    const next = nextRevealLength(1, target)
    expect(next).toBe(3)
    expect(target.slice(0, next)).toBe('a😀')
  })
})

describe('nextFollowTop', () => {
  it('eases toward the floor without overshooting', () => {
    expect(nextFollowTop(0, 100)).toBeCloseTo(22, 5)
    expect(nextFollowTop(90, 100)).toBeCloseTo(92.2)
    expect(nextFollowTop(100, 100)).toBe(100)
    expect(nextFollowTop(100, 50)).toBe(50)
  })

  it('snaps the final fraction and converges monotonically', () => {
    expect(nextFollowTop(99.8, 100)).toBe(100)
    let top = 0
    for (let index = 0; index < 40; index += 1) {
      const next = nextFollowTop(top, 100)
      expect(next).toBeGreaterThanOrEqual(top)
      expect(next).toBeLessThanOrEqual(100)
      top = next
    }
    expect(top).toBe(100)
  })
})
