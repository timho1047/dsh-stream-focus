/** Typed raw-RPC façade over the plugin's Host service. */
import type { ClientConnectionRpc } from '@deepseek-ai/dsh-client-connection/client'
import {
  SUMMARY_NAMESPACE,
  type PhraseHit,
  type PhraseQuery,
  type SummaryModelStatus,
  type SummaryReply,
  type SummaryRequest,
} from '../shared/protocol.ts'

/** One failed call to the summary service, preserving the Host's error code. */
export class SummaryRpcError extends Error {
  /**
   * @param code - stable Host error code.
   * @param message - Host error message.
   */
  constructor(readonly code: string, message: string) {
    super(`${code}: ${message}`)
    this.name = 'SummaryRpcError'
  }
}

/** Calls the summary service methods the browser owns. */
export class SummaryRpc {
  /**
   * @param rpc - connection RPC caller supplied by the Client connection service.
   */
  constructor(private readonly rpc: ClientConnectionRpc) {}

  /**
   * Generate or reuse one paragraph or segment phrase.
   * @param request - content, mode, locale, Session, and stable row identity.
   * @param signal - caller lifetime; aborting terminates the request.
   * @returns the Host's authoritative phrase and exact key.
   */
  summarize(request: SummaryRequest, signal: AbortSignal): Promise<SummaryReply> {
    return this.call<SummaryReply>('summarize', { request }, signal)
  }

  /**
   * Hydrate already-known phrases for mounted rows.
   * @param queries - descriptors carrying client-only correlation ids.
   * @param signal - caller lifetime; aborting terminates the query.
   * @returns hits in the Host's response order.
   */
  phrases(queries: readonly PhraseQuery[], signal: AbortSignal): Promise<readonly PhraseHit[]> {
    return this.call<readonly PhraseHit[]>('phrases', { queries }, signal)
  }

  /**
   * Read model diagnostics for the configuration page.
   * @param sessionId - active Session, or undefined for the deployment-default view.
   * @returns the Host's current model status.
   */
  modelStatus(sessionId: string | undefined): Promise<SummaryModelStatus> {
    return this.call<SummaryModelStatus>('modelStatus', sessionId === undefined ? {} : { sessionId }, undefined)
  }

  private async call<T>(method: string, args: Readonly<Record<string, unknown>>, signal: AbortSignal | undefined): Promise<T> {
    const result = await this.rpc.call(
      '/api',
      `${SUMMARY_NAMESPACE}/${method}`,
      { args },
      signal,
    )
    if (!result.ok) throw new SummaryRpcError(result.error.code, result.error.message)
    return result.value as T
  }
}
