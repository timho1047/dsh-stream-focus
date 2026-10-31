/**
 * Host service for model-written reasoning progress phrases.
 *
 * One Remote service owns model resolution, authoritative key derivation,
 * in-flight deduplication, phrase validation, fallback policy, and the
 * optional durable phrase store. The browser sends content descriptors only.
 */

import { Context, Service } from '@deepseek-ai/cordis'
import { createUserMessage, type GenerateOptions, type StreamChunk } from '@deepseek-ai/dsh-llm'
import type {} from '@deepseek-ai/dsh-agent-default-model'
import type {} from '@deepseek-ai/dsh-session-projection'
import { SessionId, type Session } from '@deepseek-ai/dsh-session'
import type {} from '@deepseek-ai/dsh-storage-domain'
import { Remote, RemoteError, TypertRemoteService } from '@deepseek-ai/dsh-typert-protocol'
import { Config as configSchema, type Config } from './config.ts'
import { summaryKeys, type SummaryKeys } from './keys.ts'
import { PhraseStore, type StoredPhrase } from './phrase-store.ts'
import {
  buildSummaryPrompt,
  cleanAndValidatePhrase,
  type SummaryPromptInput,
} from './prompt.ts'
import { boundedReasoningText, sessionIdentity } from './text.ts'
import {
  SUMMARY_PROMPT_VERSION,
  type AnchorIdentity,
  type ModelRef,
  type PhraseHit,
  type PhraseQuery,
  type SummaryFallback,
  type SummaryMode,
  type SummaryModelStatus,
  type SummaryReply,
  type SummaryRequest,
} from '../shared/protocol.ts'

declare module '@deepseek-ai/cordis' {
  interface Context {
    /** Host service for generated reasoning progress phrases. */
    streamFocusSummary: StreamFocusSummary
  }

  interface Events {
    /** Optional Host credential-store change; clears terminal override state. */
    'credentials/reference-updated'(ref: string): void
    /** Optional Host credential-record change; clears terminal override state. */
    'credentials/record-updated'(key: string): void
    /** Optional Host settings change; clears terminal override state. */
    'settings/document-updated'(ns: string, revision: number): void
    /** Optional Host connection generation change; clears terminal override state. */
    'connection/reset'(): void
    /** Loader merged a volatile row-config update. */
    'loader/volatile-update'(paths: readonly (readonly string[])[]): void
  }
}

/** Time a terminal override failure suppresses retrying that route. */
const OVERRIDE_INVALID_TTL_MS = 60_000

/** Bound per-Session diagnostics so long-lived Hosts do not retain dead Sessions. */
const MAX_SESSION_DIAGNOSTICS = 200

/**
 * Failure codes that mean the complete override route itself is unusable.
 * Transport and transient provider failures are deliberately absent.
 */
const TERMINAL_OVERRIDE_CODES: ReadonlySet<string> = new Set([
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
])

/** Model route that produced or is available for one request. */
interface ResolvedRoute {
  readonly active: ModelRef | null
  readonly activeSource: 'session' | 'default' | 'none'
  readonly override: ModelRef | null
  readonly effective: ModelRef | null
  readonly sessionKey: string
}

/** Validated request-local values. */
interface NormalizedRequest {
  readonly text: string
  readonly mode: SummaryMode
  readonly locale: string
  readonly sessionId?: string
  readonly anchor?: AnchorIdentity
}

/** One generated or cached phrase plus the route and record needed for aliases. */
interface Completion {
  readonly reply: SummaryReply
  readonly model: ModelRef
  readonly locale: string
  readonly record: StoredPhrase
}

/** Thrown when the model stream fails; distinguishes a partial response from an empty one. */
class GenerationFailure extends Error {
  /**
   * @param code - provider-neutral failure code from the stream finish or throw.
   * @param message - human diagnostic, never the reasoning text.
   * @param producedText - whether any text delta arrived before the failure.
   * @param options - optional underlying cause for Host logs.
   */
  constructor(
    readonly code: string,
    message: string,
    readonly producedText: boolean,
    options?: ErrorOptions,
  ) {
    super(message, options)
    this.name = 'GenerationFailure'
  }
}

/** Locale values accepted in a key are simple BCP 47-like tags. */
const LOCALE_PATTERN = /^[A-Za-z0-9](?:[A-Za-z0-9_-]{0,34})$/u

/**
 * Generate and cache short progress phrases for reasoning text.
 *
 * The service injects only `llm`; Session resolution, projections, the default
 * model, and durable storage are optional Host capabilities read through
 * `ctx.get()`. Missing capabilities narrow behavior instead of preventing the
 * row from mounting.
 */
export default class StreamFocusSummary extends TypertRemoteService {
  static inject = ['llm']
  static Config = configSchema

  private readonly config: Config
  private readonly store: PhraseStore
  private readonly inflight = new Map<string, Promise<Completion>>()
  private readonly lastFallbackBySession = new Map<string, SummaryFallback>()
  private readonly activeBySession = new Map<string, string>()
  private generating = 0
  private overrideInvalid: { readonly provider: string; readonly model: string; readonly expiresAt: number } | undefined

  /**
   * @param ctx - owning Host context.
   * @param config - loader-resolved row configuration.
   */
  constructor(ctx: Context, config: Config = configSchema({})) {
    super(ctx, 'streamFocusSummary')
    this.config = config
    this.store = new PhraseStore(ctx)
  }

  /** Read one coherent snapshot of the live row configuration. */
  private settings(): { maxChars: number; maxTokens: number; modelOverride: ModelRef | undefined } {
    const override = this.config.modelOverride.get()
    return {
      maxChars: this.config.maxChars.get(),
      maxTokens: this.config.maxTokens.get(),
      modelOverride: override === undefined
        ? undefined
        : { provider: override.provider, model: override.model },
    }
  }

  /** Open optional durable storage and subscribe to invalidation notifications. */
  protected async [Service.init](): Promise<void> {
    this.registerInvalidation()
    await this.store.open()
  }

  /**
   * Generate or read one phrase.
   * @param request - content descriptor from the browser; the Host owns model and key resolution.
   * @returns the cleaned phrase and its authoritative exact key.
   */
  @Remote('summarize')
  async summarize(request: SummaryRequest, signal?: AbortSignal): Promise<SummaryReply> {
    signal?.throwIfAborted()
    const normalized = this.normalizeRequest(request)
    if (normalized === undefined) throw badRequest('invalid summary request')
    const route = this.resolveRoute(normalized.sessionId)
    if (route.effective === null) throw unavailable('no model is available')

    const keys = this.keysFor(normalized, route.effective)
    const cached = this.store.getExact(keys.exact)
    if (cached !== undefined) {
      if (route.override !== null && sameModel(route.effective, route.override)) {
        this.lastFallbackBySession.delete(route.sessionKey)
      }
      const completion: Completion = {
        reply: { key: keys.exact, phrase: cached.phrase },
        model: route.effective,
        locale: cached.locale,
        record: cached,
      }
      await this.persistAnchor(normalized, completion)
      return completion.reply
    }

    const existing = this.inflight.get(keys.exact)
    if (existing !== undefined) {
      let completion: Completion
      try {
        completion = await existing
      } catch (error) {
        if (error instanceof GenerationFailure) throw generationError(error)
        throw error
      }
      await this.persistAnchor(normalized, completion)
      return completion.reply
    }

    if (this.generating >= 8) throw unavailable('too many concurrent summaries')
    this.generating += 1
    const operation = this.generate(normalized, route, signal).finally(() => { this.generating = Math.max(0, this.generating - 1) })
    this.inflight.set(keys.exact, operation)
    try {
      const completion = await operation
      await this.persistAnchor(normalized, completion)
      return completion.reply
    } catch (error) {
      if (error instanceof GenerationFailure) throw generationError(error)
      throw error
    } finally {
      if (this.inflight.get(keys.exact) === operation) this.inflight.delete(keys.exact)
    }
  }

  /**
   * Hydrate known phrases without generating anything.
   * @param queries - content descriptors with client correlation ids.
   * @returns hits in request order; misses are omitted.
   */
  @Remote('phrases')
  async phrases(queries: readonly PhraseQuery[], signal?: AbortSignal): Promise<readonly PhraseHit[]> {
    signal?.throwIfAborted()
    if (!Array.isArray(queries)) return []
    const hits: PhraseHit[] = []
    for (const query of queries.slice(0, 64)) {
      signal?.throwIfAborted()
      if (typeof query !== 'object' || query === null || typeof query.id !== 'string') continue
      const normalized = this.normalizeRequest(query)
      if (normalized === undefined) continue
      const route = this.resolveRoute(normalized.sessionId)
      if (route.effective === null) continue
      const keys = this.keysFor(normalized, route.effective)
      const stored = this.store.lookup(keys.exact, keys.anchor)
      if (stored === undefined) continue
      hits.push({
        id: query.id,
        key: stored.key,
        phrase: stored.record.phrase,
        locale: stored.record.locale,
      })
    }
    return hits
  }

  /**
   * Read model diagnostics without generating anything.
   * @param sessionId - Session whose active model and fallback are inspected.
   * @returns active/default resolution, configured override, effective route, and latest fallback.
   */
  @Remote('modelStatus')
  async modelStatus(sessionId?: string): Promise<SummaryModelStatus> {
    const route = this.resolveRoute(normalizeSessionId(sessionId))
    const fallback = this.lastFallbackBySession.get(route.sessionKey)
    return {
      active: cloneModel(route.active),
      activeSource: route.activeSource,
      override: cloneModel(route.override),
      effective: cloneModel(route.effective),
      ...(fallback === undefined ? {} : { lastFallback: cloneFallback(fallback) }),
    }
  }

  /** Run the override policy around one generation. */
  private async generate(input: NormalizedRequest, route: ResolvedRoute, signal?: AbortSignal): Promise<Completion> {
    const effective = route.effective
    if (effective === null) throw unavailable('no model is available')

    if (route.override !== null && sameModel(effective, route.override)) {
      try {
        const phrase = await this.generateWithModel(input, effective, signal)
        if (phrase === undefined) throw unavailable('model produced no usable phrase')
        this.overrideInvalid = undefined
        this.lastFallbackBySession.delete(route.sessionKey)
        return await this.complete(input, effective, phrase)
      } catch (error) {
        if (!(error instanceof GenerationFailure)
          || error.producedText
          || !isTerminalOverrideFailure(error.code)) {
          if (error instanceof GenerationFailure) throw generationError(error)
          throw error
        }

        this.overrideInvalid = {
          provider: effective.provider,
          model: effective.model,
          expiresAt: Date.now() + OVERRIDE_INVALID_TTL_MS,
        }
        const target = route.active
        if (target === null || sameModel(target, effective)) throw generationError(error)

        this.rememberFallback(route.sessionKey, {
          at: Date.now(),
          from: cloneModel(effective)!,
          to: cloneModel(target)!,
          reason: error.code,
        })

        const fallbackKeys = this.keysFor(input, target)
        const cached = this.store.getExact(fallbackKeys.exact)
        if (cached !== undefined) {
          return {
            reply: { key: fallbackKeys.exact, phrase: cached.phrase },
            model: target,
            locale: cached.locale,
            record: cached,
          }
        }

        const phrase = await this.generateWithModel(input, target, signal)
        if (phrase === undefined) throw unavailable('fallback model produced no usable phrase')
        return await this.complete(input, target, phrase)
      }
    }

    const phrase = await this.generateWithModel(input, effective, signal)
    if (phrase === undefined) throw unavailable('model produced no usable phrase')
    if (route.override === null) this.lastFallbackBySession.delete(route.sessionKey)
    return await this.complete(input, effective, phrase)
  }

  /**
   * Generate one phrase on one model with at most one repair retry for an
   * empty or invalid reply. Model/transport failures are not retried here.
   */
  private async generateWithModel(input: NormalizedRequest, model: ModelRef, signal?: AbortSignal): Promise<string | undefined> {
    const { maxChars } = this.settings()
    for (let attempt = 0; attempt < 2; attempt++) {
      signal?.throwIfAborted()
      const raw = await this.streamPhrase(input, model, attempt === 1, signal)
      const phrase = cleanAndValidatePhrase(raw, input.text, maxChars)
      if (phrase !== undefined) return phrase
    }
    return undefined
  }

  /** Stream one plain-text generation and collect its text deltas. */
  private async streamPhrase(input: NormalizedRequest, model: ModelRef, repair: boolean, signal?: AbortSignal): Promise<string> {
    const settings = this.settings()
    const prompt: SummaryPromptInput = {
      text: input.text,
      mode: input.mode,
      locale: input.locale,
      maxChars: settings.maxChars,
      repair,
    }
    const built = buildSummaryPrompt(prompt)
    const options: GenerateOptions = {
      provider: model.provider,
      model: model.model,
      system: built.system,
      messages: [createUserMessage({
        content: [{ type: 'text', text: built.user }],
        source: { kind: 'user' },
      })],
      temperature: 0.2,
      maxTokens: settings.maxTokens,
      ...(signal === undefined ? {} : { signal }),
    }

    let text = ''
    try {
      for await (const chunk of this.ctx.llm.stream(options)) {
        if (chunk.type === 'text-delta') {
          text += chunk.text
          continue
        }
        if (chunk.type !== 'finish') continue
        if (chunk.reason.kind === 'error') {
          throw new GenerationFailure(chunk.reason.failure.code, chunk.reason.failure.message, text.length > 0)
        }
        if (chunk.reason.kind === 'aborted') {
          throw new GenerationFailure('ABORTED', chunk.reason.failure.message, text.length > 0)
        }
        break
      }
    } catch (error) {
      if (error instanceof GenerationFailure) throw error
      throw new GenerationFailure(errorCode(error), errorMessage(error), text.length > 0, { cause: error })
    }
    return text
  }

  /** Persist one validated phrase under its exact key. */
  private async complete(input: NormalizedRequest, model: ModelRef, phrase: string): Promise<Completion> {
    const keys = this.keysFor(input, model)
    const record: StoredPhrase = {
      phrase,
      locale: input.locale,
      promptVersion: SUMMARY_PROMPT_VERSION,
      updatedAt: Date.now(),
    }
    await this.store.put(keys.exact, undefined, record)
    return {
      reply: { key: keys.exact, phrase },
      model,
      locale: input.locale,
      record,
    }
  }

  /**
   * Add the current request's anchor alias to a phrase obtained from
   * generation, cache, or a joined in-flight request. Several rows can share
   * one exact content key while carrying different stable row identities.
   */
  private async persistAnchor(input: NormalizedRequest, completion: Completion): Promise<void> {
    if (input.anchor === undefined) return
    const keys = this.keysFor(input, completion.model)
    if (keys.anchor === undefined) return
    await this.store.putAlias(keys.anchor, completion.record)
  }

  /** Derive both keys from the request and the model that actually ran. */
  private keysFor(input: NormalizedRequest, model: ModelRef): SummaryKeys {
    return summaryKeys({
      model,
      text: input.text,
      mode: input.mode,
      locale: input.locale,
      ...(input.sessionId === undefined ? {} : { sessionId: input.sessionId }),
      ...(input.anchor === undefined ? {} : { anchor: input.anchor }),
      maxChars: this.settings().maxChars,
      promptVersion: SUMMARY_PROMPT_VERSION,
    })
  }

  /** Resolve the active Session/default route and the currently effective route. */
  private resolveRoute(sessionId?: string): ResolvedRoute {
    const active = this.activeSelection(sessionId)
    const sessionKey = sessionIdentity(sessionId)
    this.noteActiveModel(sessionKey, active.model)
    const configuredOverride = this.settings().modelOverride
    const override = cloneModel(configuredOverride === undefined
      ? null
      : { provider: configuredOverride.provider, model: configuredOverride.model })
    if (override === null) this.lastFallbackBySession.delete(sessionKey)

    if (this.overrideInvalid !== undefined && Date.now() >= this.overrideInvalid.expiresAt) {
      this.overrideInvalid = undefined
    }
    const overrideUsable = override !== null
      && (this.overrideInvalid === undefined || !sameModel(override, this.overrideInvalid))
    return {
      active: active.model,
      activeSource: active.source,
      override,
      effective: overrideUsable ? override : active.model,
      sessionKey,
    }
  }

  /** Read the current Session model selection, then the default model. */
  private activeSelection(sessionId?: string): { model: ModelRef | null; source: 'session' | 'default' | 'none' } {
    const selected = this.sessionModel(sessionId)
    if (selected !== null) return { model: selected, source: 'session' }

    const defaults = this.ctx.get('agentDefaultModel')
    if (defaults !== undefined) {
      try {
        const model = toModelRef(defaults.currentSelection())
        if (model !== null) return { model, source: 'default' }
      } catch {
        // A missing default-model capability behaves like an unconfigured one.
      }
    }
    return { model: null, source: 'none' }
  }

  /** Read one Session's modelSelection projection; `pending` (wire `next`) wins. */
  private sessionModel(sessionId?: string): ModelRef | null {
    if (sessionId === undefined) return null
    const sessions = this.ctx.get('sessions')
    const projections = this.ctx.get('sessionProjections')
    if (sessions === undefined || projections === undefined) return null
    let session: Session | undefined
    try {
      session = sessions.get(SessionId(sessionId))
    } catch {
      return null
    }
    if (session === undefined) return null
    try {
      const value: unknown = projections.snapshot(session, ['modelSelection']).values.modelSelection
      return selectionFrom(value)
    } catch {
      return null
    }
  }

  /** Clear a Session fallback when its active model changes; never on ordinary reads. */
  private noteActiveModel(sessionKey: string, model: ModelRef | null): void {
    const signature = model === null ? 'none' : `${model.provider}\u0000${model.model}`
    const previous = this.activeBySession.get(sessionKey)
    if (previous !== undefined && previous !== signature) this.lastFallbackBySession.delete(sessionKey)
    this.rememberActive(sessionKey, signature)
  }

  /** Store one fallback diagnostic with an eviction bound. */
  private rememberFallback(sessionKey: string, fallback: SummaryFallback): void {
    this.lastFallbackBySession.delete(sessionKey)
    this.lastFallbackBySession.set(sessionKey, fallback)
    this.trimSessionMap(this.lastFallbackBySession)
  }

  /** Store the active-route signature with an eviction bound. */
  private rememberActive(sessionKey: string, signature: string): void {
    this.activeBySession.delete(sessionKey)
    this.activeBySession.set(sessionKey, signature)
    this.trimSessionMap(this.activeBySession)
  }

  /** Evict the oldest Session entry of one bounded diagnostics map. */
  private trimSessionMap(map: Map<string, unknown>): void {
    while (map.size > MAX_SESSION_DIAGNOSTICS) {
      const oldest = map.keys().next()
      if (oldest.done === true) break
      map.delete(oldest.value)
    }
  }

  /** Clear terminal override state for configuration, credential, catalogue, and connection changes. */
  private registerInvalidation(): void {
    const invalidate = (): void => { this.overrideInvalid = undefined }
    this.ctx.on('llm/adapters-updated', invalidate)
    this.ctx.on('llm/models-updated', invalidate)
    this.ctx.on('settings/document-updated', invalidate)
    this.ctx.on('loader/volatile-update', () => {
      this.overrideInvalid = undefined
      this.lastFallbackBySession.clear()
    })
    this.ctx.on('credentials/reference-updated', invalidate)
    this.ctx.on('credentials/record-updated', invalidate)
    this.ctx.on('connection/reset', invalidate)
    this.ctx.on('session/disposed', (session) => {
      const sessionKey = String(session.id)
      this.activeBySession.delete(sessionKey)
      this.lastFallbackBySession.delete(sessionKey)
    })
  }

  /** Parse the browser descriptor at the wire boundary. */
  private normalizeRequest(request: SummaryRequest): NormalizedRequest | undefined {
    if (typeof request !== 'object' || request === null) return undefined
    const mode = request.mode
    if (mode !== 'paragraph' && mode !== 'segment') return undefined
    if (typeof request.text !== 'string') return undefined
    if (typeof request.locale !== 'string' || !LOCALE_PATTERN.test(request.locale)) return undefined
    const text = boundedReasoningText(request.text, mode)
    if (text.length === 0) return undefined
    const sessionId = normalizeSessionId(request.sessionId)
    const anchor = normalizeAnchor(request.anchor)
    return {
      text,
      mode,
      locale: request.locale,
      ...(sessionId === undefined ? {} : { sessionId }),
      ...(anchor === undefined ? {} : { anchor }),
    }
  }
}

/** Normalize a Client-provided Session id without inventing identity. */
function normalizeSessionId(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined
  const trimmed = value.trim()
  return trimmed.length === 0 || trimmed.length > 128 ? undefined : trimmed
}

/** Validate optional stable row identity; malformed identity falls back to exact-only. */
function normalizeAnchor(value: AnchorIdentity | undefined): AnchorIdentity | undefined {
  if (value === undefined || typeof value !== 'object' || value === null) return undefined
  if (typeof value.nodeKey !== 'string' || value.nodeKey.length === 0 || value.nodeKey.length > 200) return undefined
  if (!Number.isSafeInteger(value.rowIndex) || value.rowIndex < 0) return undefined
  if (value.groupPart !== undefined && (typeof value.groupPart !== 'string' || value.groupPart.length > 100)) return undefined
  return {
    nodeKey: value.nodeKey,
    rowIndex: value.rowIndex,
    ...(value.groupPart === undefined || value.groupPart.length === 0 ? {} : { groupPart: value.groupPart }),
  }
}

/** Convert a projection/default value into a route pair, rejecting empty fields. */
function toModelRef(value: unknown): ModelRef | null {
  if (typeof value !== 'object' || value === null) return null
  const provider = Reflect.get(value, 'provider')
  const model = Reflect.get(value, 'model')
  if (typeof provider !== 'string' || provider.length === 0) return null
  if (typeof model !== 'string' || model.length === 0) return null
  return { provider, model }
}

/**
 * Read a Session model selection from either the current `next` wire view or
 * the durable projection's `pending` field. Explicitly selected `next` wins
 * over `lastUsed`.
 */
function selectionFrom(value: unknown): ModelRef | null {
  if (typeof value !== 'object' || value === null) return null
  return toModelRef(Reflect.get(value, 'next'))
    ?? toModelRef(Reflect.get(value, 'pending'))
    ?? toModelRef(Reflect.get(value, 'lastUsed'))
}

/** Whether two routes are identical for cache and diagnostics purposes. */
function sameModel(left: ModelRef | null | undefined, right: ModelRef | null | undefined): boolean {
  if (left === null || left === undefined || right === null || right === undefined) return false
  return left.provider === right.provider && left.model === right.model
}

/** Normalize and test one provider failure code against the terminal override set. */
function isTerminalOverrideFailure(code: string): boolean {
  return TERMINAL_OVERRIDE_CODES.has(normalizeCode(code))
}

/** Uppercase one failure code for stable classification. */
function normalizeCode(code: string): string {
  return code.trim().toUpperCase()
}

/** Extract a provider-neutral code from an arbitrary thrown value. */
function errorCode(error: unknown): string {
  if (error instanceof Error) {
    const code = Reflect.get(error, 'code')
    if (typeof code === 'string' && code.trim().length > 0) return normalizeCode(code)
  }
  return 'ERROR'
}

/** Format an error for a non-leaking diagnostic. */
function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

/** Read-only copy for Remote reply values. */
function cloneModel(model: ModelRef | null): ModelRef | null {
  return model === null ? null : { provider: model.provider, model: model.model }
}

/** Read-only copy of one fallback diagnostic. */
function cloneFallback(fallback: SummaryFallback): SummaryFallback {
  return {
    at: fallback.at,
    from: cloneModel(fallback.from)!,
    to: cloneModel(fallback.to)!,
    reason: fallback.reason,
  }
}

/** Build the uniform no-phrase failure without exposing reasoning text. */
function unavailable(message: string): RemoteError {
  return new RemoteError('gateway/internal', `streamFocusSummary: ${message}`, {})
}

/** Build a validation failure for a malformed wire request. */
function badRequest(message: string): RemoteError {
  return new RemoteError('gateway/bad-request', `streamFocusSummary: ${message}`, {})
}

/** Convert a model failure into the Remote carrier's generic Host failure. */
function generationError(error: GenerationFailure): RemoteError {
  return new RemoteError(
    'gateway/internal',
    `streamFocusSummary: generation failed (${error.code})`,
    {},
    { cause: error },
  )
}
