/** Wire contract shared by the summary Host service and browser runtime. */

/** Prompt behavior: one completed paragraph or the whole reasoning stretch. */
export type SummaryMode = 'paragraph' | 'segment'

/** Stable DOM identity of one reasoning row within its product node. */
export interface AnchorIdentity {
  readonly nodeKey: string
  readonly groupPart?: string
  readonly rowIndex: number
}

/** One generation request; the Host owns model, key, and storage resolution. */
export interface SummaryRequest {
  readonly text: string
  readonly mode: SummaryMode
  readonly locale: string
  readonly sessionId?: string
  readonly anchor?: AnchorIdentity
}

/** One generated or cached phrase plus its authoritative exact key. */
export interface SummaryReply {
  readonly key: string
  readonly phrase: string
}

/** One hydration lookup by content descriptor, not by a browser-derived key. */
export interface PhraseQuery extends SummaryRequest {
  /** Client-side correlation only; never persisted. */
  readonly id: string
}

/** One hydrated phrase; an anchor lookup may return a different locale. */
export interface PhraseHit {
  readonly id: string
  readonly key: string
  readonly phrase: string
  readonly locale: string
}

/** Provider/model route pair used across config and diagnostics. */
export interface ModelRef {
  readonly provider: string
  readonly model: string
}

/** Per-Session fallback diagnostic returned by `modelStatus`. */
export interface SummaryFallback {
  readonly at: number
  readonly from: ModelRef
  readonly to: ModelRef
  readonly reason: string
}

/** Read-only model diagnostics for the row configuration page. */
export interface SummaryModelStatus {
  readonly active: ModelRef | null
  readonly activeSource: 'session' | 'default' | 'none'
  readonly override: ModelRef | null
  readonly effective: ModelRef | null
  readonly lastFallback?: SummaryFallback
}

/** Public row configuration schema/value. */
export interface SummaryConfig {
  readonly maxChars: number
  readonly maxTokens: number
  readonly modelOverride?: ModelRef
}

/** Typert/gateway service namespace and raw RPC endpoint prefix. */
export const SUMMARY_NAMESPACE = 'streamFocusSummary'

/** Bump when the prompt or phrase contract changes; part of every key. */
export const SUMMARY_PROMPT_VERSION = '1'
