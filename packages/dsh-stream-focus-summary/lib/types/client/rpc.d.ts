/** Typed raw-RPC façade over the plugin's Host service. */
import type { ClientConnectionRpc } from '@deepseek-ai/dsh-client-connection/client';
import { type PhraseHit, type PhraseQuery, type SummaryModelStatus, type SummaryReply, type SummaryRequest } from '../shared/protocol.ts';
/** One failed call to the summary service, preserving the Host's error code. */
export declare class SummaryRpcError extends Error {
    readonly code: string;
    /**
     * @param code - stable Host error code.
     * @param message - Host error message.
     */
    constructor(code: string, message: string);
}
/** Calls the summary service methods the browser owns. */
export declare class SummaryRpc {
    private readonly rpc;
    /**
     * @param rpc - connection RPC caller supplied by the Client connection service.
     */
    constructor(rpc: ClientConnectionRpc);
    /**
     * Generate or reuse one paragraph or segment phrase.
     * @param request - content, mode, locale, Session, and stable row identity.
     * @param signal - caller lifetime; aborting terminates the request.
     * @returns the Host's authoritative phrase and exact key.
     */
    summarize(request: SummaryRequest, signal: AbortSignal): Promise<SummaryReply>;
    /**
     * Hydrate already-known phrases for mounted rows.
     * @param queries - descriptors carrying client-only correlation ids.
     * @param signal - caller lifetime; aborting terminates the query.
     * @returns hits in the Host's response order.
     */
    phrases(queries: readonly PhraseQuery[], signal: AbortSignal): Promise<readonly PhraseHit[]>;
    /**
     * Read model diagnostics for the configuration page.
     * @param sessionId - active Session, or undefined for the deployment-default view.
     * @returns the Host's current model status.
     */
    modelStatus(sessionId: string | undefined): Promise<SummaryModelStatus>;
    private call;
}
