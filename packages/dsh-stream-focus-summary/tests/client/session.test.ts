// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest'
import { ActiveSessionResolver, type SessionListSnapshot } from '../../src/client/session.ts'

function bench(initial: SessionListSnapshot) {
  let snapshot = initial
  const listeners = new Set<() => void>()
  let unsubscribeCount = 0
  const source = {
    getSnapshot: () => snapshot,
    subscribe: (listener: () => void) => {
      listeners.add(listener)
      return () => { listeners.delete(listener); unsubscribeCount += 1 }
    },
  }
  const resolver = new ActiveSessionResolver({ list: source })
  return {
    resolver,
    update(next: SessionListSnapshot) {
      snapshot = next
      for (const listener of [...listeners]) listener()
    },
    unsubscribeCount: () => unsubscribeCount,
  }
}

describe('ActiveSessionResolver', () => {
  it('returns the one Session retained by the main view', () => {
    const b = bench({
      ids: ['s1', 's2'],
      byId: { s1: { retainedBy: { mainView: 1 } }, s2: { retainedBy: {} } },
    })
    expect(b.resolver.current()).toBe('s1')
  })

  it('omits the identity when no Session or more than one qualifies', () => {
    const none = bench({ ids: ['s1'], byId: { s1: { retainedBy: {} } } })
    expect(none.resolver.current()).toBeUndefined()
    const many = bench({
      ids: ['s1', 's2'],
      byId: { s1: { retainedBy: { mainView: 1 } }, s2: { retainedBy: { mainView: 2 } } },
    })
    expect(many.resolver.current()).toBeUndefined()
  })

  it('notifies config-page listeners after list replacement and releases its subscription', () => {
    const b = bench({ ids: [], byId: {} })
    const listener = vi.fn()
    const unsubscribe = b.resolver.subscribe(listener)
    b.update({ ids: ['s3'], byId: { s3: { retainedBy: { mainView: 1 } } } })
    expect(listener).toHaveBeenCalledTimes(1)
    expect(b.resolver.current()).toBe('s3')
    b.resolver.dispose()
    expect(b.unsubscribeCount()).toBe(1)
    unsubscribe()
  })
})
