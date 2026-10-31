import { SUMMARY_NAMESPACE, } from "../shared/protocol.js";
/** One failed call to the summary service, preserving the Host's error code. */
export class SummaryRpcError extends Error {
    code;
    /**
     * @param code - stable Host error code.
     * @param message - Host error message.
     */
    constructor(code, message) {
        super(`${code}: ${message}`);
        this.code = code;
        this.name = 'SummaryRpcError';
    }
}
/** Calls the summary service methods the browser owns. */
export class SummaryRpc {
    rpc;
    /**
     * @param rpc - connection RPC caller supplied by the Client connection service.
     */
    constructor(rpc) {
        this.rpc = rpc;
    }
    /**
     * Generate or reuse one paragraph or segment phrase.
     * @param request - content, mode, locale, Session, and stable row identity.
     * @param signal - caller lifetime; aborting terminates the request.
     * @returns the Host's authoritative phrase and exact key.
     */
    summarize(request, signal) {
        return this.call('summarize', { request }, signal);
    }
    /**
     * Hydrate already-known phrases for mounted rows.
     * @param queries - descriptors carrying client-only correlation ids.
     * @param signal - caller lifetime; aborting terminates the query.
     * @returns hits in the Host's response order.
     */
    phrases(queries, signal) {
        return this.call('phrases', { queries }, signal);
    }
    /**
     * Read model diagnostics for the configuration page.
     * @param sessionId - active Session, or undefined for the deployment-default view.
     * @returns the Host's current model status.
     */
    modelStatus(sessionId) {
        return this.call('modelStatus', sessionId === undefined ? {} : { sessionId }, undefined);
    }
    async call(method, args, signal) {
        const result = await this.rpc.call('/api', `${SUMMARY_NAMESPACE}/${method}`, { args }, signal);
        if (!result.ok)
            throw new SummaryRpcError(result.error.code, result.error.message);
        return result.value;
    }
}
//# sourceMappingURL=rpc.js.map