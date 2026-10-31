import { describe, expect, it } from 'vitest'
import { decideWindow, type WindowCandidate, type WindowGroup } from '../src/client/decision.ts'

function candidate(patch: Partial<WindowCandidate> = {}): WindowCandidate {
  return {
    key: 'row',
    kind: 'reasoning',
    order: 0,
    open: false,
    active: false,
    auto: false,
    manual: undefined,
    ...patch,
  }
}

function group(candidates: readonly WindowCandidate[], patch: Partial<WindowGroup> = {}): WindowGroup {
  return { open: true, suppressed: false, candidates, ...patch }
}

describe('decideWindow', () => {
  it('opens a closed group before acting on its rows', () => {
    expect(decideWindow(group([candidate()], { open: false }))).toMatchObject({
      openGroup: true,
      open: ['row'],
    })
  })

  it('does not reopen a group the reader closed', () => {
    expect(decideWindow(group([candidate()], { open: false, suppressed: true })).openGroup).toBe(false)
  })

  it('keeps the newest streaming reasoning open', () => {
    const decision = decideWindow(group([
      candidate({ key: 'old', order: 0, open: true, auto: true }),
      candidate({ key: 'think', order: 2, open: false, active: true }),
    ]))
    expect(decision.open).toEqual(['think'])
    expect(decision.close).toEqual(['old'])
    expect(decision.targets).toEqual(['think'])
  })

  it('opens every tool after the newest reasoning, including a fast settled tool', () => {
    const decision = decideWindow(group([
      candidate({ key: 'think', order: 0, open: true, auto: true }),
      candidate({ key: 'tool-a', kind: 'tool', order: 1, open: false }),
      candidate({ key: 'tool-b', kind: 'tool', order: 2, open: false }),
    ]))
    expect(decision.open).toEqual(['tool-a', 'tool-b'])
    expect(decision.close).toEqual(['think'])
    expect(decision.targets).toEqual(['tool-a', 'tool-b'])
  })

  it('folds the previous tool batch when the next reasoning starts', () => {
    const decision = decideWindow(group([
      candidate({ key: 'think-1', order: 0, open: true, auto: true }),
      candidate({ key: 'tool-1', kind: 'tool', order: 1, open: true, auto: true }),
      candidate({ key: 'think-2', order: 2, open: false, active: true }),
    ]))
    expect(decision.open).toEqual(['think-2'])
    expect(decision.close).toEqual(['think-1', 'tool-1'])
  })

  it('keeps a still-running tool open even when a newer reasoning row exists', () => {
    const decision = decideWindow(group([
      candidate({ key: 'tool-live', kind: 'tool', order: 0, open: true, active: true, auto: true }),
      candidate({ key: 'think', order: 1, open: false, active: true }),
    ]))
    expect(decision.open).toEqual(['think'])
    expect(decision.close).toEqual([])
  })

  it('respects a reader who opened an old row', () => {
    const decision = decideWindow(group([
      candidate({ key: 'pinned', order: 0, open: true, auto: true, manual: 'open' }),
      candidate({ key: 'think', order: 1, open: false, active: true }),
    ]))
    expect(decision.open).toEqual(['think'])
    expect(decision.close).toEqual([])
  })

  it('respects a reader who closed the target row', () => {
    const decision = decideWindow(group([
      candidate({ key: 'think', order: 0, open: false, active: true, manual: 'closed' }),
    ]))
    expect(decision.open).toEqual([])
    expect(decision.targets).toEqual(['think'])
  })

  it('leaves rows it never opened alone', () => {
    const decision = decideWindow(group([
      candidate({ key: 'before-plugin', order: 0, open: true }),
      candidate({ key: 'tool', kind: 'tool', order: 1, open: false }),
    ]))
    expect(decision.open).toEqual(['tool'])
    expect(decision.close).toEqual([])
  })
})
