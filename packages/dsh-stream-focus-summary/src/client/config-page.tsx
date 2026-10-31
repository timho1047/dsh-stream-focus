/** Row configuration page for summary limits and the Summary model route. */
import type {
  ModelCatalog, ModelCatalogModel, ModelSelection, SettingsPathOpView,
} from '@deepseek-ai/dsh-api-remotes/client'
import React from 'react'
import type { ConfigFormSnapshot } from '@deepseek-ai/dsh-client-ui-settings/client'
import type { PluginConfigViewProps } from '@deepseek-ai/dsh-client-ui-plugin-manager/client'
import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import type { ModelRef, SummaryModelStatus } from '../shared/protocol.ts'
import type { SummaryLocaleKey } from './locales.ts'
import css from './config-page.module.css'

type Translate = (key: SummaryLocaleKey, params?: Record<string, unknown>) => string

interface LocalizedBadgeText {
  readonly en: string
  readonly [locale: string]: string
}

/** Data and callbacks supplied by the plugin's apply closure. */
export interface SummaryConfigPageInjected {
  readonly t: Translate
  readonly loadCatalog: () => Promise<ModelCatalog>
  readonly loadStatus: (sessionId: string | undefined) => Promise<SummaryModelStatus>
  readonly activeSessionId: () => string | undefined
  readonly subscribeActiveSession: (listener: () => void) => () => void
  readonly subscribeModelUpdates: (listener: () => void) => () => void
  readonly subscribeLocale: (listener: () => void) => () => void
  readonly resolveText: (text: string | LocalizedBadgeText) => string
}

/** Full prop face of the `plugins.row.config` entry. */
export type SummaryConfigPageProps = PluginConfigViewProps & SummaryConfigPageInjected

type ModelMode = 'follow' | 'override'

interface Draft {
  readonly maxChars: string
  readonly maxTokens: string
  readonly mode: ModelMode
  readonly override: ModelSelection | null
}

interface CatalogState {
  readonly value: ModelCatalog | null
  readonly status: 'loading' | 'ready' | 'error'
  readonly error: string | null
  readonly refreshing: boolean
}

interface StatusState {
  readonly value: SummaryModelStatus | null
  readonly status: 'loading' | 'ready' | 'error'
  readonly error: string | null
}

interface ModelOption {
  readonly provider: string
  readonly providerName: string
  readonly model: ModelCatalogModel
  readonly index: number
  readonly active: boolean
  readonly selected: boolean
}

interface ProviderView {
  readonly id: string
  readonly name: string
  readonly options: readonly ModelOption[]
}

const DEFAULT_DRAFT: Draft = { maxChars: '30', maxTokens: '800', mode: 'follow', override: null }

/**
 * Render the row's one-line description or its full page. `summary` is also
 * the fallback when the plugin manager has no package description.
 * @param props - view, plugin-manager form, and apply-closure data.
 * @returns the requested row configuration view.
 */
export function SummaryConfigPage(props: SummaryConfigPageProps): ReactNode {
  if (props.view === 'summary') return <SummaryBrief form={props.form} t={props.t} />
  return <SummaryConfigForm {...props} />
}

function SummaryBrief({ form, t }: Pick<SummaryConfigPageProps, 'form' | 't'>): ReactNode {
  const accepted = readDraft(form?.state)
  if (accepted?.mode === 'override' && accepted.override !== null) {
    return <span>{t('summaryOverride', { route: routeOf(accepted.override) })}</span>
  }
  return <span>{t('summaryFollow')}</span>
}

function SummaryConfigForm(props: SummaryConfigPageProps): ReactNode {
  const { form, t } = props
  const fieldId = useId().replaceAll(':', '')
  const accepted = useMemo(() => readDraft(form?.state), [form?.state])
  const [draft, setDraft] = useState<Draft>(accepted ?? DEFAULT_DRAFT)
  const [dirty, setDirty] = useState(false)
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'rejected' | 'conflict' | 'failed'>('idle')
  const [catalog, setCatalog] = useState<CatalogState>({
    value: null,
    status: 'loading',
    error: null,
    refreshing: false,
  })
  const [status, setStatus] = useState<StatusState>({ value: null, status: 'loading', error: null })
  const [sessionId, setSessionId] = useState<string | undefined>(() => props.activeSessionId())
  const [statusRevision, setStatusRevision] = useState(0)
  const [, setLocaleRevision] = useState(0)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [activeIndex, setActiveIndex] = useState(0)
  const formRef = useRef(form)
  formRef.current = form
  const statusToken = useRef(0)
  const catalogToken = useRef(0)
  const triggerRef = useRef<HTMLButtonElement | null>(null)
  const searchRef = useRef<HTMLInputElement | null>(null)
  const selectorRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!dirty && accepted !== undefined) {
      setDraft(current => sameDraft(current, accepted) ? current : accepted)
    }
  }, [accepted, dirty])

  useEffect(() => {
    const dispose = props.subscribeLocale(() => { setLocaleRevision(value => value + 1) })
    return dispose
  }, [props.subscribeLocale])

  useEffect(() => {
    setSessionId(props.activeSessionId())
    return props.subscribeActiveSession(() => { setSessionId(props.activeSessionId()) })
  }, [props.activeSessionId, props.subscribeActiveSession])

  const loadCatalog = props.loadCatalog
  const refreshCatalog = useMemo(() => async (): Promise<void> => {
    const token = ++catalogToken.current
    setCatalog(current => ({
      ...current,
      status: current.value === null ? 'loading' : current.status,
      refreshing: current.value !== null,
      error: null,
    }))
    try {
      const value = await loadCatalog()
      if (token !== catalogToken.current) return
      setCatalog({ value, status: 'ready', error: null, refreshing: false })
    } catch (error) {
      if (token !== catalogToken.current) return
      setCatalog(current => ({
        ...current,
        status: current.value === null ? 'error' : 'ready',
        error: messageOf(error),
        refreshing: false,
      }))
    }
  }, [loadCatalog])

  useEffect(() => {
    void refreshCatalog()
    const dispose = props.subscribeModelUpdates(() => {
      void refreshCatalog()
      setStatusRevision(value => value + 1)
    })
    return dispose
  }, [props.subscribeModelUpdates, refreshCatalog])

  const loadStatus = props.loadStatus
  useEffect(() => {
    const token = ++statusToken.current
    setStatus(current => ({ ...current, status: 'loading', error: null }))
    void loadStatus(sessionId).then(
      (value) => {
        if (token !== statusToken.current) return
        setStatus({ value, status: 'ready', error: null })
      },
      (error: unknown) => {
        if (token !== statusToken.current) return
        setStatus({ value: null, status: 'error', error: messageOf(error) })
      },
    )
  }, [loadStatus, sessionId, statusRevision])

  useEffect(() => {
    if (!pickerOpen) return
    const onPointerDown = (event: PointerEvent): void => {
      const target = event.target
      if (!(target instanceof Node)) return
      if (selectorRef.current?.contains(target) === true) return
      setPickerOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => { document.removeEventListener('pointerdown', onPointerDown) }
  }, [pickerOpen])

  useEffect(() => {
    if (!pickerOpen) return
    searchRef.current?.focus()
  }, [pickerOpen])

  const charsInvalid = !isIntegerInRange(draft.maxChars, 10, 80)
  const tokensInvalid = !isIntegerInRange(draft.maxTokens, 256, 4_000)
  const overrideInvalid = draft.mode === 'override' && !isComplete(draft.override)
  const invalid = charsInvalid || tokensInvalid || overrideInvalid
  const writable = form?.state.writable === true
  const disabled = !writable || saveState === 'saving'
  const active = status.value?.active ?? null
  const effective = status.value?.effective ?? null
  const selected = draft.mode === 'override' ? draft.override : null
  const activeSource = status.value?.activeSource ?? 'none'
  const catalogReady = catalog.status === 'ready' && catalog.value !== null
  const selectedInCatalog = selected === null || catalog.value === null
    ? true
    : catalogContains(catalog.value, selected)
  const fallback = status.value?.lastFallback

  const grouped = useMemo(() => groupCatalog(catalog.value, search, active, selected), [catalog.value, search, active, selected])
  const flat = useMemo(() => grouped.flatMap(group => group.options), [grouped])
  const boundedIndex = flat.length === 0 ? 0 : Math.min(activeIndex, flat.length - 1)
  const activeOption = flat[boundedIndex]
  const listId = `${fieldId}-model-list`
  const activeOptionId = activeOption === undefined ? undefined : optionId(fieldId, activeOption.index)

  const openPicker = (): void => {
    setPickerOpen(true)
    setSearch('')
    setActiveIndex(0)
  }

  const choose = (provider: string, model: string): void => {
    setDraft(current => ({ ...current, mode: 'override', override: { provider, model } }))
    setDirty(true)
    setSaveState('idle')
    setPickerOpen(false)
    triggerRef.current?.focus()
  }

  const clear = (): void => {
    setDraft(current => ({ ...current, mode: 'follow', override: null }))
    setDirty(true)
    setSaveState('idle')
  }

  const edit = (field: 'maxChars' | 'maxTokens', value: string): void => {
    setDraft(current => ({ ...current, [field]: value }))
    setDirty(true)
    setSaveState('idle')
  }

  const discard = (): void => {
    setDraft(accepted ?? DEFAULT_DRAFT)
    setDirty(false)
    setSaveState('idle')
  }

  const save = async (): Promise<void> => {
    const target = formRef.current
    if (target === undefined || !dirty || invalid || !writable || saveState === 'saving') return
    const revision = target.state.revision
    setSaveState('saving')
    const ops: SettingsPathOpView[] = [
      { op: 'set', path: ['maxChars'], value: Number(draft.maxChars) },
      { op: 'set', path: ['maxTokens'], value: Number(draft.maxTokens) },
      selected === null
        ? { op: 'unset', path: ['modelOverride'] }
        : { op: 'set', path: ['modelOverride'], value: { provider: selected.provider, model: selected.model } },
    ]
    try {
      const acceptedByHost = await target.mutate(ops, revision)
      if (acceptedByHost) {
        setDirty(false)
        setSaveState('saved')
        return
      }
      const current = formRef.current?.state
      setSaveState(current?.revision !== undefined && revision !== undefined && current.revision !== revision
        ? 'conflict'
        : 'rejected')
    } catch {
      setSaveState('failed')
    }
  }

  const onPickerKeyDown = (event: React.KeyboardEvent<HTMLElement>): void => {
    if (event.key === 'Escape') {
      event.preventDefault()
      setPickerOpen(false)
      triggerRef.current?.focus()
      return
    }
    // Enter and arrow traversal belong to the search field. A focused Retry or
    // provider row keeps its own native keyboard behavior.
    if (event.target !== searchRef.current) return
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setActiveIndex(index => flat.length === 0 ? 0 : Math.min(index + 1, flat.length - 1))
      return
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault()
      setActiveIndex(index => flat.length === 0 ? 0 : Math.max(index - 1, 0))
      return
    }
    if (event.key === 'Enter' && activeOption !== undefined) {
      event.preventDefault()
      choose(activeOption.provider, activeOption.model.id)
    }
  }

  useEffect(() => {
    if (!pickerOpen) return
    const option = activeOption === undefined ? null : document.getElementById(optionId(fieldId, activeOption.index))
    if (option !== null && typeof option.scrollIntoView === 'function') {
      option.scrollIntoView({ block: 'nearest' })
    }
  }, [activeOption, fieldId, pickerOpen])

  if (form === undefined) return <p className={css.muted} role="status">{t('unavailable')}</p>
  if (form.state.status === 'loading' || form.state.value === undefined) {
    return <p className={css.muted} role="status">{t('loading')}</p>
  }
  if (form.state.status === 'unavailable') return <p className={css.muted} role="status">{t('unavailable')}</p>

  return (
    <form className={css.page} onSubmit={(event) => { event.preventDefault(); void save() }}>
      <section className={css.section} aria-labelledby={`${fieldId}-status-title`}>
        <h4 id={`${fieldId}-status-title`} className={css.sectionTitle}>{t('currentStatus')}</h4>
        <dl className={css.statusGrid}>
          <div className={css.statusItem}>
            <dt className={css.statusLabel}>{t('active')}</dt>
            <dd className={css.statusValue}>
              <span className={css.source}>{sourceLabel(activeSource, t)}</span>
              {active === null ? <span className={css.mutedValue}>{t('activeSourceNone')}</span> : <RouteValue value={active} />}
            </dd>
          </div>
          <div className={css.statusItem}>
            <dt className={css.statusLabel}>{t('effective')}</dt>
            <dd className={css.statusValue}>
              {effective === null ? <span className={css.mutedValue}>{t('activeSourceNone')}</span> : <RouteValue value={effective} />}
            </dd>
          </div>
          {selected !== null && (
            <div className={css.statusItem}>
              <dt className={css.statusLabel}>{t('configured')}</dt>
              <dd className={css.statusValue}><RouteValue value={selected} /></dd>
            </div>
          )}
        </dl>
        {sessionId === undefined && <p className={css.notice}>{t('unboundSession')}</p>}
        {status.status === 'loading' && <p className={css.muted} role="status">{t('statusLoading')}</p>}
        {status.status === 'error' && (
          <p className={css.notice} role="status">
            {t('statusUnavailable')}
            {status.error === null ? null : ` ${status.error}`}
          </p>
        )}
        {status.status === 'ready' && effective === null && (
          <p className={css.alert} role="alert">{t('noModelError')}</p>
        )}
      </section>

      <fieldset className={css.section} disabled={disabled}>
        <legend className={css.sectionTitle}>{t('modelMode')}</legend>
        <label className={css.modeOption}>
          <input
            type="radio"
            name="summary-model-mode"
            checked={draft.mode === 'follow'}
            onChange={clear}
          />
          <span>
            <span className={css.modeTitle}>{t('followModel')}</span>
            <span className={css.hint}>{t('followModelHint')}</span>
          </span>
        </label>
        <label className={css.modeOption}>
          <input
            type="radio"
            name="summary-model-mode"
            checked={draft.mode === 'override'}
            onChange={() => {
              setDraft(current => ({ ...current, mode: 'override' }))
              setDirty(true)
              setSaveState('idle')
            }}
          />
          <span>
            <span className={css.modeTitle}>{t('overrideModel')}</span>
            <span className={css.hint}>{t('overrideModelHint')}</span>
          </span>
        </label>

        {draft.mode === 'override' && (
          <div className={css.selector} ref={selectorRef}>
            <button
              ref={triggerRef}
              type="button"
              className={css.trigger}
              disabled={disabled}
              aria-haspopup="listbox"
              aria-expanded={pickerOpen}
              aria-controls={pickerOpen ? listId : undefined}
              onClick={() => { if (pickerOpen) setPickerOpen(false); else openPicker() }}
            >
              <span className={css.triggerText}>
                {selected === null ? t('chooseModel') : <RouteValue value={selected} />}
              </span>
              <span className={css.triggerAction}>{selected === null ? t('chooseModel') : t('changeModel')}</span>
            </button>
            {selected !== null && (
              <button type="button" className={css.clearButton} disabled={disabled} onClick={clear}>
                {t('clearModel')}
              </button>
            )}
            {pickerOpen && (
              <div className={css.picker} role="dialog" aria-label={t('modelPicker')} onKeyDown={onPickerKeyDown}>
                <input
                  ref={searchRef}
                  className={css.search}
                  type="search"
                  role="combobox"
                  aria-expanded="true"
                  aria-controls={listId}
                  aria-autocomplete="list"
                  aria-activedescendant={activeOptionId}
                  placeholder={t('searchModels')}
                  aria-label={t('searchModels')}
                  value={search}
                  onChange={(event) => { setSearch(event.target.value); setActiveIndex(0) }}
                />
                {catalog.refreshing && <p className={css.muted} role="status">{t('catalogRefreshing')}</p>}
                {catalog.status === 'loading' && catalog.value === null && (
                  <p className={css.muted} role="status">{t('catalogLoading')}</p>
                )}
                {catalog.status === 'error' && (
                  <div className={css.failure} role="alert">
                    <p>{t('catalogFailed')}</p>
                    <button type="button" className={css.retry} onClick={() => { void refreshCatalog() }}>
                      {t('retry')}
                    </button>
                  </div>
                )}
                {catalogReady && (
                  <>
                    {grouped.length === 0 && <p className={css.muted}>{t('noModels')}</p>}
                    <div className={css.list} id={listId} role="listbox" aria-label={t('modelPicker')}>
                      {grouped.map(group => (
                        <div key={group.id} className={css.providerGroup} role="group" aria-label={group.name}>
                          <div className={css.providerName}>{group.name}</div>
                          {group.options.map(option => (
                            <button
                              key={`${group.id}/${option.model.id}`}
                              id={optionId(fieldId, option.index)}
                              type="button"
                              role="option"
                              aria-selected={option.selected}
                              className={option.index === boundedIndex ? css.optionActive : css.option}
                              onMouseEnter={() => { setActiveIndex(option.index) }}
                              onClick={() => { choose(option.provider, option.model.id) }}
                            >
                              <span className={css.optionMain}>
                                <span className={css.optionName}>
                                  {option.model.name}
                                  {option.model.badge !== undefined && (
                                    <span className={css.badge} data-tone={option.model.badge.tone}>
                                      {props.resolveText(option.model.badge.text)}
                                    </span>
                                  )}
                                </span>
                                <span className={css.route}>{option.provider}/{option.model.id}</span>
                              </span>
                              <span className={css.marks}>
                                {option.active && <span className={css.mark}>{t(activeSource === 'default' ? 'currentDefaultBadge' : 'currentBadge')}</span>}
                                {option.selected && <span className={css.mark}>{t('selectedBadge')}</span>}
                              </span>
                            </button>
                          ))}
                        </div>
                      ))}
                    </div>
                    {catalog.value !== null && catalog.value.failures.length > 0 && (
                      <div className={css.failures}>
                        {catalog.value.failures.map(failure => (
                          <div key={failure.id} className={css.failure} role="status">
                            <p>{t('providerFailed', { provider: failure.name, message: failure.message })}</p>
                            <button type="button" className={css.retry} onClick={() => { void refreshCatalog() }}>
                              {t('retry')}
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                    {catalog.value !== null && catalog.value.groups.length === 0 && catalog.value.failures.length === 0 && (
                      <p className={css.muted}>{t('noCatalog')}</p>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        )}
      </fieldset>

      <section className={css.section} aria-labelledby={`${fieldId}-limits`}>
        <h4 id={`${fieldId}-limits`} className={css.sectionTitle}>{t('limitsTitle')}</h4>
        <div className={css.fields}>
          <label className={css.field}>
            <span className={css.fieldLabel}>{t('maxChars')}</span>
            <input
              className={charsInvalid ? css.inputInvalid : css.input}
              type="text"
              inputMode="numeric"
              value={draft.maxChars}
              disabled={disabled}
              aria-invalid={charsInvalid}
              aria-describedby={`${fieldId}-chars-message`}
              onChange={(event) => { edit('maxChars', event.target.value) }}
            />
            <span id={`${fieldId}-chars-message`} className={charsInvalid ? css.invalidText : css.hint}>
              {charsInvalid ? t('invalidChars') : t('maxCharsHint')}
            </span>
          </label>
          <label className={css.field}>
            <span className={css.fieldLabel}>{t('maxTokens')}</span>
            <input
              className={tokensInvalid ? css.inputInvalid : css.input}
              type="text"
              inputMode="numeric"
              value={draft.maxTokens}
              disabled={disabled}
              aria-invalid={tokensInvalid}
              aria-describedby={`${fieldId}-tokens-message`}
              onChange={(event) => { edit('maxTokens', event.target.value) }}
            />
            <span id={`${fieldId}-tokens-message`} className={tokensInvalid ? css.invalidText : css.hint}>
              {tokensInvalid ? t('invalidTokens') : t('maxTokensHint')}
            </span>
          </label>
        </div>
      </section>

      {overrideInvalid && <p className={css.alert} role="alert">{t('overrideRequired')}</p>}
      {selected !== null && catalogReady && !selectedInCatalog && (
        <p className={css.alert} role="alert">{t('missingRouteWarning')}</p>
      )}
      {catalog.error !== null && (
        <div className={css.alert} role="alert">
          <span>{t('catalogWarning')}</span>
          <button type="button" className={css.retry} onClick={() => { void refreshCatalog() }}>
            {t('retry')}
          </button>
        </div>
      )}
      {fallback !== undefined && (
        <p className={css.alert} role="alert">
          {t('fallbackWarning', {
            from: routeOf(fallback.from),
            to: routeOf(fallback.to),
            time: formatTime(fallback.at),
            reason: fallback.reason,
          })}
        </p>
      )}

      {!writable && <p className={css.notice} role="status">{t('readOnly')}</p>}
      <div className={css.actions}>
        <span className={css.saveState} role="status" aria-live="polite">
          {saveState === 'saved' ? t('saved') : null}
          {saveState === 'rejected' ? t('rejected') : null}
          {saveState === 'conflict' ? t('conflict') : null}
          {saveState === 'failed' ? t('saveFailed') : null}
        </span>
        <button type="button" className={css.secondary} disabled={!dirty || saveState === 'saving'} onClick={discard}>
          {t('discard')}
        </button>
        <button type="submit" className={css.primary} disabled={!dirty || invalid || !writable || saveState === 'saving'}>
          {saveState === 'saving' ? t('saving') : t('save')}
        </button>
      </div>
    </form>
  )
}

function RouteValue({ value }: { readonly value: ModelRef }): ReactNode {
  return <code className={css.route}>{value.provider}/{value.model}</code>
}

function sourceLabel(source: SummaryModelStatus['activeSource'], t: Translate): string {
  switch (source) {
    case 'session': return t('activeSourceSession')
    case 'default': return t('activeSourceDefault')
    case 'none': return t('activeSourceNone')
  }
}

function readDraft(snapshot: ConfigFormSnapshot<Record<string, unknown>> | undefined): Draft | undefined {
  const value = snapshot?.value
  if (value === undefined) return undefined
  const maxChars = typeof value.maxChars === 'number' || typeof value.maxChars === 'string'
    ? String(value.maxChars) : DEFAULT_DRAFT.maxChars
  const maxTokens = typeof value.maxTokens === 'number' || typeof value.maxTokens === 'string'
    ? String(value.maxTokens) : DEFAULT_DRAFT.maxTokens
  const override = value.modelOverride
  if (isComplete(override)) return { maxChars, maxTokens, mode: 'override', override }
  if (override === undefined || override === null) return { maxChars, maxTokens, mode: 'follow', override: null }
  return { maxChars, maxTokens, mode: 'override', override: null }
}

function sameDraft(left: Draft, right: Draft): boolean {
  return left.maxChars === right.maxChars
    && left.maxTokens === right.maxTokens
    && left.mode === right.mode
    && left.override?.provider === right.override?.provider
    && left.override?.model === right.override?.model
}

function isComplete(value: unknown): value is ModelSelection {
  return typeof value === 'object' && value !== null
    && typeof (value as { provider?: unknown }).provider === 'string'
    && (value as { provider: string }).provider !== ''
    && typeof (value as { model?: unknown }).model === 'string'
    && (value as { model: string }).model !== ''
}

function isIntegerInRange(text: string, minimum: number, maximum: number): boolean {
  if (!/^\d+$/u.test(text.trim())) return false
  const value = Number(text)
  return Number.isSafeInteger(value) && value >= minimum && value <= maximum
}

function routeOf(value: ModelRef): string {
  return `${value.provider}/${value.model}`
}

function catalogContains(catalog: ModelCatalog, selection: ModelSelection): boolean {
  return catalog.groups.some(group => group.id === selection.provider
    && group.models.some(model => model.id === selection.model))
}

function groupCatalog(
  catalog: ModelCatalog | null,
  search: string,
  active: ModelRef | null,
  selected: ModelSelection | null,
): ProviderView[] {
  const query = search.trim().toLowerCase()
  const groups: ProviderView[] = []
  let index = 0
  for (const group of catalog?.groups ?? []) {
    const models = group.models.filter(model => query === ''
      || model.name.toLowerCase().includes(query)
      || model.id.toLowerCase().includes(query)
      || group.name.toLowerCase().includes(query)
      || group.id.toLowerCase().includes(query))
    if (models.length === 0) continue
    groups.push({
      id: group.id,
      name: group.name,
      options: models.map(model => ({
        provider: group.id,
        providerName: group.name,
        model,
        index: index++,
        active: active?.provider === group.id && active.model === model.id,
        selected: selected?.provider === group.id && selected.model === model.id,
      })),
    })
  }
  return groups
}

function optionId(fieldId: string, index: number): string {
  return `${fieldId}-model-option-${index}`
}

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

function formatTime(at: number): string {
  const date = new Date(at)
  if (Number.isNaN(date.getTime())) return String(at)
  return date.toLocaleString()
}
