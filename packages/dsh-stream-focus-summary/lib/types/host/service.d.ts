/**
 * Host service for model-written reasoning progress phrases.
 *
 * One Remote service owns model resolution, authoritative key derivation,
 * in-flight deduplication, phrase validation, fallback policy, and the
 * optional durable phrase store. The browser sends content descriptors only.
 */
import { Context, Service } from '@deepseek-ai/cordis';
import { TypertRemoteService } from '@deepseek-ai/dsh-typert-protocol';
import { type Config } from './config.ts';
import { type PhraseHit, type PhraseQuery, type SummaryModelStatus, type SummaryReply, type SummaryRequest } from '../shared/protocol.ts';
declare module '@deepseek-ai/cordis' {
    interface Context {
        /** Host service for generated reasoning progress phrases. */
        streamFocusSummary: StreamFocusSummary;
    }
    interface Events {
        /** Optional Host credential-store change; clears terminal override state. */
        'credentials/reference-updated'(ref: string): void;
        /** Optional Host credential-record change; clears terminal override state. */
        'credentials/record-updated'(key: string): void;
        /** Optional Host settings change; clears terminal override state. */
        'settings/document-updated'(ns: string, revision: number): void;
        /** Optional Host connection generation change; clears terminal override state. */
        'connection/reset'(): void;
        /** Loader merged a volatile row-config update. */
        'loader/volatile-update'(paths: readonly (readonly string[])[]): void;
    }
}
/**
 * Generate and cache short progress phrases for reasoning text.
 *
 * The service injects only `llm`; Session resolution, projections, the default
 * model, and durable storage are optional Host capabilities read through
 * `ctx.get()`. Missing capabilities narrow behavior instead of preventing the
 * row from mounting.
 */
export default class StreamFocusSummary extends TypertRemoteService {
    static inject: string[];
    static Config: import("@deepseek-ai/schemastery").default<Schemastery.ObjectS<NoInfer<{
        maxChars: import("@deepseek-ai/schemastery").default<number, number, "volatile-defined">;
        maxTokens: import("@deepseek-ai/schemastery").default<number, number, "volatile-defined">;
        modelOverride: import("@deepseek-ai/schemastery").default<NoInfer<Schemastery.ObjectS<NoInfer<{
            provider: import("@deepseek-ai/schemastery").default<string, string, "defined">;
            model: import("@deepseek-ai/schemastery").default<string, string, "defined">;
        }>>>, NoInfer<Schemastery.ObjectT<NoInfer<{
            provider: import("@deepseek-ai/schemastery").default<string, string, "defined">;
            model: import("@deepseek-ai/schemastery").default<string, string, "defined">;
        }>>>, "volatile-defined">;
    }>>, Schemastery.ObjectT<NoInfer<{
        maxChars: import("@deepseek-ai/schemastery").default<number, number, "volatile-defined">;
        maxTokens: import("@deepseek-ai/schemastery").default<number, number, "volatile-defined">;
        modelOverride: import("@deepseek-ai/schemastery").default<NoInfer<Schemastery.ObjectS<NoInfer<{
            provider: import("@deepseek-ai/schemastery").default<string, string, "defined">;
            model: import("@deepseek-ai/schemastery").default<string, string, "defined">;
        }>>>, NoInfer<Schemastery.ObjectT<NoInfer<{
            provider: import("@deepseek-ai/schemastery").default<string, string, "defined">;
            model: import("@deepseek-ai/schemastery").default<string, string, "defined">;
        }>>>, "volatile-defined">;
    }>>, "plain">;
    private readonly config;
    private readonly store;
    private readonly inflight;
    private readonly lastFallbackBySession;
    private readonly activeBySession;
    private generating;
    private overrideInvalid;
    /**
     * @param ctx - owning Host context.
     * @param config - loader-resolved row configuration.
     */
    constructor(ctx: Context, config?: Config);
    /** Read one coherent snapshot of the live row configuration. */
    private settings;
    /** Open optional durable storage and subscribe to invalidation notifications. */
    protected [Service.init](): Promise<void>;
    /**
     * Generate or read one phrase.
     * @param request - content descriptor from the browser; the Host owns model and key resolution.
     * @returns the cleaned phrase and its authoritative exact key.
     */
    summarize(request: SummaryRequest, signal?: AbortSignal): Promise<SummaryReply>;
    /**
     * Hydrate known phrases without generating anything.
     * @param queries - content descriptors with client correlation ids.
     * @returns hits in request order; misses are omitted.
     */
    phrases(queries: readonly PhraseQuery[], signal?: AbortSignal): Promise<readonly PhraseHit[]>;
    /**
     * Read model diagnostics without generating anything.
     * @param sessionId - Session whose active model and fallback are inspected.
     * @returns active/default resolution, configured override, effective route, and latest fallback.
     */
    modelStatus(sessionId?: string): Promise<SummaryModelStatus>;
    /** Run the override policy around one generation. */
    private generate;
    /**
     * Generate one phrase on one model with at most one repair retry for an
     * empty or invalid reply. Model/transport failures are not retried here.
     */
    private generateWithModel;
    /** Stream one plain-text generation and collect its text deltas. */
    private streamPhrase;
    /** Persist one validated phrase under its exact key. */
    private complete;
    /**
     * Add the current request's anchor alias to a phrase obtained from
     * generation, cache, or a joined in-flight request. Several rows can share
     * one exact content key while carrying different stable row identities.
     */
    private persistAnchor;
    /** Derive both keys from the request and the model that actually ran. */
    private keysFor;
    /** Resolve the active Session/default route and the currently effective route. */
    private resolveRoute;
    /** Read the current Session model selection, then the default model. */
    private activeSelection;
    /** Read one Session's modelSelection projection; `pending` (wire `next`) wins. */
    private sessionModel;
    /** Clear a Session fallback when its active model changes; never on ordinary reads. */
    private noteActiveModel;
    /** Store one fallback diagnostic with an eviction bound. */
    private rememberFallback;
    /** Store the active-route signature with an eviction bound. */
    private rememberActive;
    /** Evict the oldest Session entry of one bounded diagnostics map. */
    private trimSessionMap;
    /** Clear terminal override state for configuration, credential, catalogue, and connection changes. */
    private registerInvalidation;
    /** Parse the browser descriptor at the wire boundary. */
    private normalizeRequest;
}
