/**
 * Host service for model-written reasoning progress phrases.
 *
 * One Remote service owns model resolution, authoritative key derivation,
 * in-flight deduplication, phrase validation, fallback policy, and the
 * optional durable phrase store. The browser sends content descriptors only.
 */
var __runInitializers = (this && this.__runInitializers) || function (thisArg, initializers, value) {
    var useValue = arguments.length > 2;
    for (var i = 0; i < initializers.length; i++) {
        value = useValue ? initializers[i].call(thisArg, value) : initializers[i].call(thisArg);
    }
    return useValue ? value : void 0;
};
var __esDecorate = (this && this.__esDecorate) || function (ctor, descriptorIn, decorators, contextIn, initializers, extraInitializers) {
    function accept(f) { if (f !== void 0 && typeof f !== "function") throw new TypeError("Function expected"); return f; }
    var kind = contextIn.kind, key = kind === "getter" ? "get" : kind === "setter" ? "set" : "value";
    var target = !descriptorIn && ctor ? contextIn["static"] ? ctor : ctor.prototype : null;
    var descriptor = descriptorIn || (target ? Object.getOwnPropertyDescriptor(target, contextIn.name) : {});
    var _, done = false;
    for (var i = decorators.length - 1; i >= 0; i--) {
        var context = {};
        for (var p in contextIn) context[p] = p === "access" ? {} : contextIn[p];
        for (var p in contextIn.access) context.access[p] = contextIn.access[p];
        context.addInitializer = function (f) { if (done) throw new TypeError("Cannot add initializers after decoration has completed"); extraInitializers.push(accept(f || null)); };
        var result = (0, decorators[i])(kind === "accessor" ? { get: descriptor.get, set: descriptor.set } : descriptor[key], context);
        if (kind === "accessor") {
            if (result === void 0) continue;
            if (result === null || typeof result !== "object") throw new TypeError("Object expected");
            if (_ = accept(result.get)) descriptor.get = _;
            if (_ = accept(result.set)) descriptor.set = _;
            if (_ = accept(result.init)) initializers.unshift(_);
        }
        else if (_ = accept(result)) {
            if (kind === "field") initializers.unshift(_);
            else descriptor[key] = _;
        }
    }
    if (target) Object.defineProperty(target, contextIn.name, descriptor);
    done = true;
};
import { Service } from '@deepseek-ai/cordis';
import { createUserMessage } from '@deepseek-ai/dsh-llm';
import { SessionId } from '@deepseek-ai/dsh-session';
import { Remote, RemoteError, TypertRemoteService } from '@deepseek-ai/dsh-typert-protocol';
import { Config as configSchema } from "./config.js";
import { summaryKeys } from "./keys.js";
import { PhraseStore } from "./phrase-store.js";
import { buildSummaryPrompt, cleanAndValidatePhrase, } from "./prompt.js";
import { boundedReasoningText, sessionIdentity } from "./text.js";
import { SUMMARY_PROMPT_VERSION, } from "../shared/protocol.js";
/** Time a terminal override failure suppresses retrying that route. */
const OVERRIDE_INVALID_TTL_MS = 60_000;
/** Bound per-Session diagnostics so long-lived Hosts do not retain dead Sessions. */
const MAX_SESSION_DIAGNOSTICS = 200;
/**
 * Failure codes that mean the complete override route itself is unusable.
 * Transport and transient provider failures are deliberately absent.
 */
const TERMINAL_OVERRIDE_CODES = new Set([
    'UNKNOWN_MODEL',
    'NO_ADAPTER',
    'AUTH',
    'MISSING_CREDENTIAL',
    'INVALID_CREDENTIAL',
    'QUOTA',
    'ACCOUNT_QUOTA',
    'INVALID_MODEL',
    'MODEL_NOT_FOUND',
    'UNSUPPORTED_MODEL',
    'INVALID_PROVIDER',
    'PROVIDER_NOT_FOUND',
    'NO_PROVIDER',
    'ROUTE_NOT_FOUND',
    'INVALID_ROUTE',
    'UNAUTHORIZED',
    'FORBIDDEN',
    'MISSING_API_KEY',
    'INVALID_API_KEY',
    'NO_API_KEY',
    'NO_CREDENTIAL',
    'CREDENTIAL_MISSING',
    'CREDENTIAL_UNAVAILABLE',
    'INSUFFICIENT_QUOTA',
    'QUOTA_EXHAUSTED',
    'BILLING_REQUIRED',
    'ACCOUNT_SUSPENDED',
    'ACCOUNT_DISABLED',
]);
/** Thrown when the model stream fails; distinguishes a partial response from an empty one. */
class GenerationFailure extends Error {
    code;
    producedText;
    /**
     * @param code - provider-neutral failure code from the stream finish or throw.
     * @param message - human diagnostic, never the reasoning text.
     * @param producedText - whether any text delta arrived before the failure.
     * @param options - optional underlying cause for Host logs.
     */
    constructor(code, message, producedText, options) {
        super(message, options);
        this.code = code;
        this.producedText = producedText;
        this.name = 'GenerationFailure';
    }
}
/** Locale values accepted in a key are simple BCP 47-like tags. */
const LOCALE_PATTERN = /^[A-Za-z0-9](?:[A-Za-z0-9_-]{0,34})$/u;
let StreamFocusSummary = (() => {
    let _classSuper = TypertRemoteService;
    let _instanceExtraInitializers = [];
    let _summarize_decorators;
    let _phrases_decorators;
    let _modelStatus_decorators;
    return class StreamFocusSummary extends _classSuper {
        static {
            const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(_classSuper[Symbol.metadata] ?? null) : void 0;
            _summarize_decorators = [Remote('summarize')];
            _phrases_decorators = [Remote('phrases')];
            _modelStatus_decorators = [Remote('modelStatus')];
            __esDecorate(this, null, _summarize_decorators, { kind: "method", name: "summarize", static: false, private: false, access: { has: obj => "summarize" in obj, get: obj => obj.summarize }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _phrases_decorators, { kind: "method", name: "phrases", static: false, private: false, access: { has: obj => "phrases" in obj, get: obj => obj.phrases }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _modelStatus_decorators, { kind: "method", name: "modelStatus", static: false, private: false, access: { has: obj => "modelStatus" in obj, get: obj => obj.modelStatus }, metadata: _metadata }, null, _instanceExtraInitializers);
            if (_metadata) Object.defineProperty(this, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        }
        static inject = ['llm'];
        static Config = configSchema;
        config = __runInitializers(this, _instanceExtraInitializers);
        store;
        inflight = new Map();
        lastFallbackBySession = new Map();
        activeBySession = new Map();
        generating = 0;
        overrideInvalid;
        /**
         * @param ctx - owning Host context.
         * @param config - loader-resolved row configuration.
         */
        constructor(ctx, config = configSchema({})) {
            super(ctx, 'streamFocusSummary');
            this.config = config;
            this.store = new PhraseStore(ctx);
        }
        /** Read one coherent snapshot of the live row configuration. */
        settings() {
            const override = this.config.modelOverride.get();
            return {
                maxChars: this.config.maxChars.get(),
                maxTokens: this.config.maxTokens.get(),
                modelOverride: override === undefined
                    ? undefined
                    : { provider: override.provider, model: override.model },
            };
        }
        /** Open optional durable storage and subscribe to invalidation notifications. */
        async [Service.init]() {
            this.registerInvalidation();
            await this.store.open();
        }
        /**
         * Generate or read one phrase.
         * @param request - content descriptor from the browser; the Host owns model and key resolution.
         * @returns the cleaned phrase and its authoritative exact key.
         */
        async summarize(request, signal) {
            signal?.throwIfAborted();
            const normalized = this.normalizeRequest(request);
            if (normalized === undefined)
                throw badRequest('invalid summary request');
            const route = this.resolveRoute(normalized.sessionId);
            if (route.effective === null)
                throw unavailable('no model is available');
            const keys = this.keysFor(normalized, route.effective);
            const cached = this.store.getExact(keys.exact);
            if (cached !== undefined) {
                if (route.override !== null && sameModel(route.effective, route.override)) {
                    this.lastFallbackBySession.delete(route.sessionKey);
                }
                const completion = {
                    reply: { key: keys.exact, phrase: cached.phrase },
                    model: route.effective,
                    locale: cached.locale,
                    record: cached,
                };
                await this.persistAnchor(normalized, completion);
                return completion.reply;
            }
            const existing = this.inflight.get(keys.exact);
            if (existing !== undefined) {
                let completion;
                try {
                    completion = await existing;
                }
                catch (error) {
                    if (error instanceof GenerationFailure)
                        throw generationError(error);
                    throw error;
                }
                await this.persistAnchor(normalized, completion);
                return completion.reply;
            }
            if (this.generating >= 8)
                throw unavailable('too many concurrent summaries');
            this.generating += 1;
            const operation = this.generate(normalized, route, signal).finally(() => { this.generating = Math.max(0, this.generating - 1); });
            this.inflight.set(keys.exact, operation);
            try {
                const completion = await operation;
                await this.persistAnchor(normalized, completion);
                return completion.reply;
            }
            catch (error) {
                if (error instanceof GenerationFailure)
                    throw generationError(error);
                throw error;
            }
            finally {
                if (this.inflight.get(keys.exact) === operation)
                    this.inflight.delete(keys.exact);
            }
        }
        /**
         * Hydrate known phrases without generating anything.
         * @param queries - content descriptors with client correlation ids.
         * @returns hits in request order; misses are omitted.
         */
        async phrases(queries, signal) {
            signal?.throwIfAborted();
            if (!Array.isArray(queries))
                return [];
            const hits = [];
            for (const query of queries.slice(0, 64)) {
                signal?.throwIfAborted();
                if (typeof query !== 'object' || query === null || typeof query.id !== 'string')
                    continue;
                const normalized = this.normalizeRequest(query);
                if (normalized === undefined)
                    continue;
                const route = this.resolveRoute(normalized.sessionId);
                if (route.effective === null)
                    continue;
                const keys = this.keysFor(normalized, route.effective);
                const stored = this.store.lookup(keys.exact, keys.anchor);
                if (stored === undefined)
                    continue;
                hits.push({
                    id: query.id,
                    key: stored.key,
                    phrase: stored.record.phrase,
                    locale: stored.record.locale,
                });
            }
            return hits;
        }
        /**
         * Read model diagnostics without generating anything.
         * @param sessionId - Session whose active model and fallback are inspected.
         * @returns active/default resolution, configured override, effective route, and latest fallback.
         */
        async modelStatus(sessionId) {
            const route = this.resolveRoute(normalizeSessionId(sessionId));
            const fallback = this.lastFallbackBySession.get(route.sessionKey);
            return {
                active: cloneModel(route.active),
                activeSource: route.activeSource,
                override: cloneModel(route.override),
                effective: cloneModel(route.effective),
                ...(fallback === undefined ? {} : { lastFallback: cloneFallback(fallback) }),
            };
        }
        /** Run the override policy around one generation. */
        async generate(input, route, signal) {
            const effective = route.effective;
            if (effective === null)
                throw unavailable('no model is available');
            if (route.override !== null && sameModel(effective, route.override)) {
                try {
                    const phrase = await this.generateWithModel(input, effective, signal);
                    if (phrase === undefined)
                        throw unavailable('model produced no usable phrase');
                    this.overrideInvalid = undefined;
                    this.lastFallbackBySession.delete(route.sessionKey);
                    return await this.complete(input, effective, phrase);
                }
                catch (error) {
                    if (!(error instanceof GenerationFailure)
                        || error.producedText
                        || !isTerminalOverrideFailure(error.code)) {
                        if (error instanceof GenerationFailure)
                            throw generationError(error);
                        throw error;
                    }
                    this.overrideInvalid = {
                        provider: effective.provider,
                        model: effective.model,
                        expiresAt: Date.now() + OVERRIDE_INVALID_TTL_MS,
                    };
                    const target = route.active;
                    if (target === null || sameModel(target, effective))
                        throw generationError(error);
                    this.rememberFallback(route.sessionKey, {
                        at: Date.now(),
                        from: cloneModel(effective),
                        to: cloneModel(target),
                        reason: error.code,
                    });
                    const fallbackKeys = this.keysFor(input, target);
                    const cached = this.store.getExact(fallbackKeys.exact);
                    if (cached !== undefined) {
                        return {
                            reply: { key: fallbackKeys.exact, phrase: cached.phrase },
                            model: target,
                            locale: cached.locale,
                            record: cached,
                        };
                    }
                    const phrase = await this.generateWithModel(input, target, signal);
                    if (phrase === undefined)
                        throw unavailable('fallback model produced no usable phrase');
                    return await this.complete(input, target, phrase);
                }
            }
            const phrase = await this.generateWithModel(input, effective, signal);
            if (phrase === undefined)
                throw unavailable('model produced no usable phrase');
            if (route.override === null)
                this.lastFallbackBySession.delete(route.sessionKey);
            return await this.complete(input, effective, phrase);
        }
        /**
         * Generate one phrase on one model with at most one repair retry for an
         * empty or invalid reply. Model/transport failures are not retried here.
         */
        async generateWithModel(input, model, signal) {
            const { maxChars } = this.settings();
            for (let attempt = 0; attempt < 2; attempt++) {
                signal?.throwIfAborted();
                const raw = await this.streamPhrase(input, model, attempt === 1, signal);
                const phrase = cleanAndValidatePhrase(raw, input.text, maxChars);
                if (phrase !== undefined)
                    return phrase;
            }
            return undefined;
        }
        /** Stream one plain-text generation and collect its text deltas. */
        async streamPhrase(input, model, repair, signal) {
            const settings = this.settings();
            const prompt = {
                text: input.text,
                mode: input.mode,
                locale: input.locale,
                maxChars: settings.maxChars,
                repair,
            };
            const built = buildSummaryPrompt(prompt);
            const options = {
                provider: model.provider,
                model: model.model,
                system: built.system,
                messages: [createUserMessage({
                        content: [{ type: 'text', text: built.user }],
                        source: { kind: 'user' },
                    })],
                temperature: 0.2,
                maxTokens: settings.maxTokens,
                stop: ['\n'],
                ...(signal === undefined ? {} : { signal }),
            };
            let text = '';
            try {
                for await (const chunk of this.ctx.llm.stream(options)) {
                    if (chunk.type === 'text-delta') {
                        text += chunk.text;
                        continue;
                    }
                    if (chunk.type !== 'finish')
                        continue;
                    if (chunk.reason.kind === 'error') {
                        throw new GenerationFailure(chunk.reason.failure.code, chunk.reason.failure.message, text.length > 0);
                    }
                    if (chunk.reason.kind === 'aborted') {
                        throw new GenerationFailure('ABORTED', chunk.reason.failure.message, text.length > 0);
                    }
                    break;
                }
            }
            catch (error) {
                if (error instanceof GenerationFailure)
                    throw error;
                throw new GenerationFailure(errorCode(error), errorMessage(error), text.length > 0, { cause: error });
            }
            return text;
        }
        /** Persist one validated phrase under its exact key. */
        async complete(input, model, phrase) {
            const keys = this.keysFor(input, model);
            const record = {
                phrase,
                locale: input.locale,
                promptVersion: SUMMARY_PROMPT_VERSION,
                updatedAt: Date.now(),
            };
            await this.store.put(keys.exact, undefined, record);
            return {
                reply: { key: keys.exact, phrase },
                model,
                locale: input.locale,
                record,
            };
        }
        /**
         * Add the current request's anchor alias to a phrase obtained from
         * generation, cache, or a joined in-flight request. Several rows can share
         * one exact content key while carrying different stable row identities.
         */
        async persistAnchor(input, completion) {
            if (input.anchor === undefined)
                return;
            const keys = this.keysFor(input, completion.model);
            if (keys.anchor === undefined)
                return;
            await this.store.putAlias(keys.anchor, completion.record);
        }
        /** Derive both keys from the request and the model that actually ran. */
        keysFor(input, model) {
            return summaryKeys({
                model,
                text: input.text,
                mode: input.mode,
                locale: input.locale,
                ...(input.sessionId === undefined ? {} : { sessionId: input.sessionId }),
                ...(input.anchor === undefined ? {} : { anchor: input.anchor }),
                maxChars: this.settings().maxChars,
                promptVersion: SUMMARY_PROMPT_VERSION,
            });
        }
        /** Resolve the active Session/default route and the currently effective route. */
        resolveRoute(sessionId) {
            const active = this.activeSelection(sessionId);
            const sessionKey = sessionIdentity(sessionId);
            this.noteActiveModel(sessionKey, active.model);
            const configuredOverride = this.settings().modelOverride;
            const override = cloneModel(configuredOverride === undefined
                ? null
                : { provider: configuredOverride.provider, model: configuredOverride.model });
            if (override === null)
                this.lastFallbackBySession.delete(sessionKey);
            if (this.overrideInvalid !== undefined && Date.now() >= this.overrideInvalid.expiresAt) {
                this.overrideInvalid = undefined;
            }
            const overrideUsable = override !== null
                && (this.overrideInvalid === undefined || !sameModel(override, this.overrideInvalid));
            return {
                active: active.model,
                activeSource: active.source,
                override,
                effective: overrideUsable ? override : active.model,
                sessionKey,
            };
        }
        /** Read the current Session model selection, then the default model. */
        activeSelection(sessionId) {
            const selected = this.sessionModel(sessionId);
            if (selected !== null)
                return { model: selected, source: 'session' };
            const defaults = this.ctx.get('agentDefaultModel');
            if (defaults !== undefined) {
                try {
                    const model = toModelRef(defaults.currentSelection());
                    if (model !== null)
                        return { model, source: 'default' };
                }
                catch {
                    // A missing default-model capability behaves like an unconfigured one.
                }
            }
            return { model: null, source: 'none' };
        }
        /** Read one Session's modelSelection projection; `pending` (wire `next`) wins. */
        sessionModel(sessionId) {
            if (sessionId === undefined)
                return null;
            const sessions = this.ctx.get('sessions');
            const projections = this.ctx.get('sessionProjections');
            if (sessions === undefined || projections === undefined)
                return null;
            let session;
            try {
                session = sessions.get(SessionId(sessionId));
            }
            catch {
                return null;
            }
            if (session === undefined)
                return null;
            try {
                const value = projections.snapshot(session, ['modelSelection']).values.modelSelection;
                return selectionFrom(value);
            }
            catch {
                return null;
            }
        }
        /** Clear a Session fallback when its active model changes; never on ordinary reads. */
        noteActiveModel(sessionKey, model) {
            const signature = model === null ? 'none' : `${model.provider}\u0000${model.model}`;
            const previous = this.activeBySession.get(sessionKey);
            if (previous !== undefined && previous !== signature)
                this.lastFallbackBySession.delete(sessionKey);
            this.rememberActive(sessionKey, signature);
        }
        /** Store one fallback diagnostic with an eviction bound. */
        rememberFallback(sessionKey, fallback) {
            this.lastFallbackBySession.delete(sessionKey);
            this.lastFallbackBySession.set(sessionKey, fallback);
            this.trimSessionMap(this.lastFallbackBySession);
        }
        /** Store the active-route signature with an eviction bound. */
        rememberActive(sessionKey, signature) {
            this.activeBySession.delete(sessionKey);
            this.activeBySession.set(sessionKey, signature);
            this.trimSessionMap(this.activeBySession);
        }
        /** Evict the oldest Session entry of one bounded diagnostics map. */
        trimSessionMap(map) {
            while (map.size > MAX_SESSION_DIAGNOSTICS) {
                const oldest = map.keys().next();
                if (oldest.done === true)
                    break;
                map.delete(oldest.value);
            }
        }
        /** Clear terminal override state for configuration, credential, catalogue, and connection changes. */
        registerInvalidation() {
            const invalidate = () => { this.overrideInvalid = undefined; };
            this.ctx.on('llm/adapters-updated', invalidate);
            this.ctx.on('llm/models-updated', invalidate);
            this.ctx.on('settings/document-updated', invalidate);
            this.ctx.on('loader/volatile-update', () => {
                this.overrideInvalid = undefined;
                this.lastFallbackBySession.clear();
            });
            this.ctx.on('credentials/reference-updated', invalidate);
            this.ctx.on('credentials/record-updated', invalidate);
            this.ctx.on('connection/reset', invalidate);
            this.ctx.on('session/disposed', (session) => {
                const sessionKey = String(session.id);
                this.activeBySession.delete(sessionKey);
                this.lastFallbackBySession.delete(sessionKey);
            });
        }
        /** Parse the browser descriptor at the wire boundary. */
        normalizeRequest(request) {
            if (typeof request !== 'object' || request === null)
                return undefined;
            const mode = request.mode;
            if (mode !== 'paragraph' && mode !== 'segment')
                return undefined;
            if (typeof request.text !== 'string')
                return undefined;
            if (typeof request.locale !== 'string' || !LOCALE_PATTERN.test(request.locale))
                return undefined;
            const text = boundedReasoningText(request.text, mode);
            if (text.length === 0)
                return undefined;
            const sessionId = normalizeSessionId(request.sessionId);
            const anchor = normalizeAnchor(request.anchor);
            return {
                text,
                mode,
                locale: request.locale,
                ...(sessionId === undefined ? {} : { sessionId }),
                ...(anchor === undefined ? {} : { anchor }),
            };
        }
    };
})();
/**
 * Generate and cache short progress phrases for reasoning text.
 *
 * The service injects only `llm`; Session resolution, projections, the default
 * model, and durable storage are optional Host capabilities read through
 * `ctx.get()`. Missing capabilities narrow behavior instead of preventing the
 * row from mounting.
 */
export default StreamFocusSummary;
/** Normalize a Client-provided Session id without inventing identity. */
function normalizeSessionId(value) {
    if (typeof value !== 'string')
        return undefined;
    const trimmed = value.trim();
    return trimmed.length === 0 || trimmed.length > 128 ? undefined : trimmed;
}
/** Validate optional stable row identity; malformed identity falls back to exact-only. */
function normalizeAnchor(value) {
    if (value === undefined || typeof value !== 'object' || value === null)
        return undefined;
    if (typeof value.nodeKey !== 'string' || value.nodeKey.length === 0 || value.nodeKey.length > 200)
        return undefined;
    if (!Number.isSafeInteger(value.rowIndex) || value.rowIndex < 0)
        return undefined;
    if (value.groupPart !== undefined && (typeof value.groupPart !== 'string' || value.groupPart.length > 100))
        return undefined;
    return {
        nodeKey: value.nodeKey,
        rowIndex: value.rowIndex,
        ...(value.groupPart === undefined || value.groupPart.length === 0 ? {} : { groupPart: value.groupPart }),
    };
}
/** Convert a projection/default value into a route pair, rejecting empty fields. */
function toModelRef(value) {
    if (typeof value !== 'object' || value === null)
        return null;
    const provider = Reflect.get(value, 'provider');
    const model = Reflect.get(value, 'model');
    if (typeof provider !== 'string' || provider.length === 0)
        return null;
    if (typeof model !== 'string' || model.length === 0)
        return null;
    return { provider, model };
}
/**
 * Read a Session model selection from either the current `next` wire view or
 * the durable projection's `pending` field. Explicitly selected `next` wins
 * over `lastUsed`.
 */
function selectionFrom(value) {
    if (typeof value !== 'object' || value === null)
        return null;
    return toModelRef(Reflect.get(value, 'next'))
        ?? toModelRef(Reflect.get(value, 'pending'))
        ?? toModelRef(Reflect.get(value, 'lastUsed'));
}
/** Whether two routes are identical for cache and diagnostics purposes. */
function sameModel(left, right) {
    if (left === null || left === undefined || right === null || right === undefined)
        return false;
    return left.provider === right.provider && left.model === right.model;
}
/** Normalize and test one provider failure code against the terminal override set. */
function isTerminalOverrideFailure(code) {
    return TERMINAL_OVERRIDE_CODES.has(normalizeCode(code));
}
/** Uppercase one failure code for stable classification. */
function normalizeCode(code) {
    return code.trim().toUpperCase();
}
/** Extract a provider-neutral code from an arbitrary thrown value. */
function errorCode(error) {
    if (error instanceof Error) {
        const code = Reflect.get(error, 'code');
        if (typeof code === 'string' && code.trim().length > 0)
            return normalizeCode(code);
    }
    return 'ERROR';
}
/** Format an error for a non-leaking diagnostic. */
function errorMessage(error) {
    return error instanceof Error ? error.message : String(error);
}
/** Read-only copy for Remote reply values. */
function cloneModel(model) {
    return model === null ? null : { provider: model.provider, model: model.model };
}
/** Read-only copy of one fallback diagnostic. */
function cloneFallback(fallback) {
    return {
        at: fallback.at,
        from: cloneModel(fallback.from),
        to: cloneModel(fallback.to),
        reason: fallback.reason,
    };
}
/** Build the uniform no-phrase failure without exposing reasoning text. */
function unavailable(message) {
    return new RemoteError('gateway/internal', `streamFocusSummary: ${message}`, {});
}
/** Build a validation failure for a malformed wire request. */
function badRequest(message) {
    return new RemoteError('gateway/bad-request', `streamFocusSummary: ${message}`, {});
}
/** Convert a model failure into the Remote carrier's generic Host failure. */
function generationError(error) {
    return new RemoteError('gateway/internal', `streamFocusSummary: generation failed (${error.code})`, {}, { cause: error });
}
//# sourceMappingURL=service.js.map