import { Context } from '@deepseek-ai/cordis'
import { modelSelectionProjectionDefinition } from '@deepseek-ai/dsh-agent'
import { LlmRuntime, type GenerateOptions, type StreamChunk } from '@deepseek-ai/dsh-llm'
import SessionStore, { SessionId, type Session } from '@deepseek-ai/dsh-session'
import SessionProjectionRegistry from '@deepseek-ai/dsh-session-projection'
import { onTestFinished } from 'vitest'
import StreamFocusSummary from '../../src/index.ts'
import type { ModelRef, SummaryConfig } from '../../src/shared/protocol.ts'

/** One scripted model call handler. */
export type LlmHandler = (options: GenerateOptions) => AsyncIterable<StreamChunk>

/** Run an array of chunks as one model stream. */
export async function* streamOf(chunks: readonly StreamChunk[]): AsyncIterable<StreamChunk> {
  yield* chunks
}

/** A successful one-shot text response. */
export function textResponse(text: string): StreamChunk[] {
  return [
    { type: 'text-delta', index: 0, text },
    { type: 'finish', reason: { kind: 'stop' } },
  ]
}

/** A terminal provider failure with no text. */
export function errorResponse(code: string, message = code): StreamChunk[] {
  return [{ type: 'finish', reason: { kind: 'error', failure: { code, message } } }]
}

/** A provider failure after some text already arrived. */
export function partialErrorResponse(partial: string, code: string): StreamChunk[] {
  return [
    { type: 'text-delta', index: 0, text: partial },
    { type: 'finish', reason: { kind: 'error', failure: { code, message: code } } },
  ]
}

/** One persisted phrase, structurally matching the internal store record. */
export interface TestPhrase {
  readonly phrase: string
  readonly locale: string
  readonly promptVersion: string
  readonly updatedAt: number
}

/** In-memory stand-in for the optional storageDomain facility. */
export interface FakeStorage {
  readonly service: {
    open(spec: unknown): Promise<unknown>
    get(name: string): undefined
    closeAll(): Promise<void>
  }
  readonly records: Map<string, TestPhrase>
  readonly specs: unknown[]
  readonly table: {
    get(key: string): TestPhrase | undefined
    entries(): IterableIterator<[string, TestPhrase]>
    keys(): IterableIterator<string>
    readonly size: number
    put(key: string, value: TestPhrase): Promise<void>
    delete(key: string): Promise<boolean>
    deleteMany(keys: readonly string[]): Promise<number>
  }
  readonly deleted: string[]
}

/**
 * Build a fake storage facility whose open() returns one phrase table.
 * @param seed - optional durable records loaded as if from disk.
 * @param failure - optional open or read failure for fail-soft cases.
 * @returns facility-shaped service and observable table.
 */
export function fakeStorage(
  seed: ReadonlyArray<readonly [string, TestPhrase]> = [],
  failure: { readonly open?: Error; readonly entries?: Error } = {},
): FakeStorage {
  const records = new Map<string, TestPhrase>(seed)
  const specs: unknown[] = []
  const deleted: string[] = []
  const table: FakeStorage['table'] = {
    get: key => records.get(key),
    entries: () => {
      if (failure.entries !== undefined) throw failure.entries
      return records.entries()
    },
    keys: () => records.keys(),
    get size() { return records.size },
    put: async (key, value) => { records.set(key, value) },
    delete: async (key) => records.delete(key),
    deleteMany: async (keys) => {
      let removed = 0
      for (const key of keys) {
        if (records.delete(key)) {
          removed += 1
          deleted.push(key)
        }
      }
      return removed
    },
  }

  const service: FakeStorage['service'] = {
    open: async (spec) => {
      if (failure.open !== undefined) throw failure.open
      specs.push(spec)
      return {
        name: 'stream-focus-summary',
        table: (name: string) => {
          if (name !== 'phrases') throw new Error(`unexpected table: ${name}`)
          return table
        },
        close: async () => {},
      }
    },
    get: () => undefined,
    closeAll: async () => {},
  }
  return { service, records, specs, table, deleted }
}

/** Options for a Host test harness. */
export interface HarnessOptions {
  readonly config?: Partial<SummaryConfig>
  readonly handler?: LlmHandler
  readonly storage?: FakeStorage
  /** Session id → initial model selection; omitted id still exists with no selection. */
  readonly sessions?: Record<string, ModelRef | null>
  /** Mount the projection registry when Session models are used; defaults to true. */
  readonly projections?: boolean
  /** Default model when no Session projection wins. */
  readonly defaultModel?: ModelRef | null
}

/** Observable Host test context. */
export interface Harness {
  readonly ctx: Context
  readonly service: StreamFocusSummary
  readonly calls: GenerateOptions[]
  readonly sessions: Map<string, Session>
  readonly storage?: FakeStorage
}

/**
 * Mount LLM, optional Session/projection/default/storage services, and the
 * summary service on a fresh Cordis context.
 * @param options - scripted responses and optional Host capabilities.
 * @returns the context, service, and recorded model calls.
 */
export async function createHarness(options: HarnessOptions = {}): Promise<Harness> {
  const ctx = new Context()
  onTestFinished(() => ctx.fiber.dispose())

  const calls: GenerateOptions[] = []
  const llm = new LlmRuntime(ctx)
  const handler = options.handler ?? (() => streamOf(textResponse('checked the configuration')))
  llm.stream = (request) => {
    calls.push(request)
    return handler(request)
  }

  if (options.storage !== undefined) ctx.provide('storageDomain', options.storage.service as never)

  const sessions = new Map<string, Session>()
  if (options.sessions !== undefined) {
    await ctx.plugin(SessionStore)
    if (options.projections !== false) {
      await ctx.plugin(SessionProjectionRegistry)
      await ctx.sessionProjections.register(modelSelectionProjectionDefinition)
    }
    for (const [id, selection] of Object.entries(options.sessions)) {
      const session = ctx.sessions.create(SessionId(id))
      if (selection !== null) session.append('model/selection', selection)
      sessions.set(id, session)
    }
  }

  if (options.defaultModel !== undefined && options.defaultModel !== null) {
    const defaultModel = options.defaultModel
    ctx.provide('agentDefaultModel', {
      currentSelection: () => ({ provider: defaultModel.provider, model: defaultModel.model }),
    } as never)
  }

  await ctx.plugin(StreamFocusSummary, options.config ?? {})
  return { ctx, service: ctx.streamFocusSummary, calls, sessions, ...(options.storage === undefined ? {} : { storage: options.storage }) }
}
