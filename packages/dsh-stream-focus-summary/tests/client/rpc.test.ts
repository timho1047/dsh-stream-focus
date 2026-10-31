// @vitest-environment jsdom
import type { ClientConnectionRpc } from '@deepseek-ai/dsh-client-connection/client'
import { describe, expect, it, vi } from 'vitest'
import type { PhraseQuery, SummaryRequest } from '../../src/shared/protocol.ts'
import { SummaryRpc, SummaryRpcError } from '../../src/client/rpc.ts'

const REQUEST: SummaryRequest = {
  text: 'Checking plugin slots',
  mode: 'paragraph',
  locale: 'en',
  sessionId: 's1',
  anchor: { nodeKey: 'node-1', rowIndex: 0 },
}

function bench(value: unknown = { key: 'k', phrase: 'p' }) {
  const call = vi.fn(async (
    _channel: string,
    _endpoint: string,
    _payload: unknown,
    _signal?: AbortSignal,
  ) => ({ ok: true as const, value }))
  const rpc: ClientConnectionRpc = { call }
  return { client: new SummaryRpc(rpc), call }
}

function payloadOf(call: ReturnType<typeof bench>['call']): Record<string, unknown> {
  const payload = call.mock.calls[0]?.[2]
  expect(payload).toBeTypeOf('object')
  return payload as Record<string, unknown>
}

describe('SummaryRpc', () => {
  it('sends summarize arguments under the named request field', async () => {
    const b = bench()
    const controller = new AbortController()
    await b.client.summarize(REQUEST, controller.signal)
    expect(b.call).toHaveBeenCalledWith(
      '/api',
      'streamFocusSummary/summarize',
      { args: { request: REQUEST } },
      controller.signal,
    )
    expect(Object.keys(payloadOf(b.call))).toEqual(['args'])
  })

  it('sends phrases arguments under the named queries field', async () => {
    const b = bench([])
    const queries: PhraseQuery[] = [{ ...REQUEST, id: 'q1' }]
    await b.client.phrases(queries, new AbortController().signal)
    expect(b.call.mock.calls[0]?.[2]).toEqual({ args: { queries } })
    expect(b.call.mock.calls[0]?.[1]).toBe('streamFocusSummary/phrases')
  })

  it('sends modelStatus as an empty object or the named sessionId', async () => {
    const empty = bench({ active: null, activeSource: 'none', override: null, effective: null })
    await empty.client.modelStatus(undefined)
    expect(empty.call.mock.calls[0]?.[2]).toEqual({ args: {} })

    const selected = bench({
      active: { provider: 'p', model: 'm' },
      activeSource: 'session',
      override: null,
      effective: { provider: 'p', model: 'm' },
    })
    await selected.client.modelStatus('session-1')
    expect(selected.call.mock.calls[0]?.[2]).toEqual({ args: { sessionId: 'session-1' } })
    expect(selected.call.mock.calls[0]?.[1]).toBe('streamFocusSummary/modelStatus')
  })

  it('throws a coded error for a Host {ok:false} result', async () => {
    const call = vi.fn(async () => ({
      ok: false as const,
      error: { code: 'MISSING_CREDENTIAL', message: 'no credential', details: {} },
    }))
    const client = new SummaryRpc({ call })
    await expect(client.summarize(REQUEST, new AbortController().signal)).rejects.toMatchObject({
      name: 'SummaryRpcError',
      code: 'MISSING_CREDENTIAL',
      message: 'MISSING_CREDENTIAL: no credential',
    } satisfies Partial<SummaryRpcError>)
  })
})
