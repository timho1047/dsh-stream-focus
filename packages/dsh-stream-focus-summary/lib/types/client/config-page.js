import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useId, useMemo, useRef, useState, } from 'react';
import css from './config-page.module.css';
const DEFAULT_DRAFT = { maxChars: '30', maxTokens: '800', mode: 'follow', override: null };
/**
 * Render the row's one-line description or its full page. `summary` is also
 * the fallback when the plugin manager has no package description.
 * @param props - view, plugin-manager form, and apply-closure data.
 * @returns the requested row configuration view.
 */
export function SummaryConfigPage(props) {
    if (props.view === 'summary')
        return _jsx(SummaryBrief, { form: props.form, t: props.t });
    return _jsx(SummaryConfigForm, { ...props });
}
function SummaryBrief({ form, t }) {
    const accepted = readDraft(form?.state);
    if (accepted?.mode === 'override' && accepted.override !== null) {
        return _jsx("span", { children: t('summaryOverride', { route: routeOf(accepted.override) }) });
    }
    return _jsx("span", { children: t('summaryFollow') });
}
function SummaryConfigForm(props) {
    const { form, t } = props;
    const fieldId = useId().replaceAll(':', '');
    const accepted = useMemo(() => readDraft(form?.state), [form?.state]);
    const [draft, setDraft] = useState(accepted ?? DEFAULT_DRAFT);
    const [dirty, setDirty] = useState(false);
    const [saveState, setSaveState] = useState('idle');
    const [catalog, setCatalog] = useState({
        value: null,
        status: 'loading',
        error: null,
        refreshing: false,
    });
    const [status, setStatus] = useState({ value: null, status: 'loading', error: null });
    const [sessionId, setSessionId] = useState(() => props.activeSessionId());
    const [statusRevision, setStatusRevision] = useState(0);
    const [, setLocaleRevision] = useState(0);
    const [pickerOpen, setPickerOpen] = useState(false);
    const [search, setSearch] = useState('');
    const [activeIndex, setActiveIndex] = useState(0);
    const formRef = useRef(form);
    formRef.current = form;
    const statusToken = useRef(0);
    const catalogToken = useRef(0);
    const triggerRef = useRef(null);
    const searchRef = useRef(null);
    const selectorRef = useRef(null);
    useEffect(() => {
        if (!dirty && accepted !== undefined) {
            setDraft(current => sameDraft(current, accepted) ? current : accepted);
        }
    }, [accepted, dirty]);
    useEffect(() => {
        const dispose = props.subscribeLocale(() => { setLocaleRevision(value => value + 1); });
        return dispose;
    }, [props.subscribeLocale]);
    useEffect(() => {
        setSessionId(props.activeSessionId());
        return props.subscribeActiveSession(() => { setSessionId(props.activeSessionId()); });
    }, [props.activeSessionId, props.subscribeActiveSession]);
    const loadCatalog = props.loadCatalog;
    const refreshCatalog = useMemo(() => async () => {
        const token = ++catalogToken.current;
        setCatalog(current => ({
            ...current,
            status: current.value === null ? 'loading' : current.status,
            refreshing: current.value !== null,
            error: null,
        }));
        try {
            const value = await loadCatalog();
            if (token !== catalogToken.current)
                return;
            setCatalog({ value, status: 'ready', error: null, refreshing: false });
        }
        catch (error) {
            if (token !== catalogToken.current)
                return;
            setCatalog(current => ({
                ...current,
                status: current.value === null ? 'error' : 'ready',
                error: messageOf(error),
                refreshing: false,
            }));
        }
    }, [loadCatalog]);
    useEffect(() => {
        void refreshCatalog();
        const dispose = props.subscribeModelUpdates(() => {
            void refreshCatalog();
            setStatusRevision(value => value + 1);
        });
        return dispose;
    }, [props.subscribeModelUpdates, refreshCatalog]);
    const loadStatus = props.loadStatus;
    useEffect(() => {
        const token = ++statusToken.current;
        setStatus(current => ({ ...current, status: 'loading', error: null }));
        void loadStatus(sessionId).then((value) => {
            if (token !== statusToken.current)
                return;
            setStatus({ value, status: 'ready', error: null });
        }, (error) => {
            if (token !== statusToken.current)
                return;
            setStatus({ value: null, status: 'error', error: messageOf(error) });
        });
    }, [loadStatus, sessionId, statusRevision]);
    useEffect(() => {
        if (!pickerOpen)
            return;
        const onPointerDown = (event) => {
            const target = event.target;
            if (!(target instanceof Node))
                return;
            if (selectorRef.current?.contains(target) === true)
                return;
            setPickerOpen(false);
        };
        document.addEventListener('pointerdown', onPointerDown);
        return () => { document.removeEventListener('pointerdown', onPointerDown); };
    }, [pickerOpen]);
    useEffect(() => {
        if (!pickerOpen)
            return;
        searchRef.current?.focus();
    }, [pickerOpen]);
    const charsInvalid = !isIntegerInRange(draft.maxChars, 10, 80);
    const tokensInvalid = !isIntegerInRange(draft.maxTokens, 256, 4_000);
    const overrideInvalid = draft.mode === 'override' && !isComplete(draft.override);
    const invalid = charsInvalid || tokensInvalid || overrideInvalid;
    const writable = form?.state.writable === true;
    const disabled = !writable || saveState === 'saving';
    const active = status.value?.active ?? null;
    const effective = status.value?.effective ?? null;
    const selected = draft.mode === 'override' ? draft.override : null;
    const activeSource = status.value?.activeSource ?? 'none';
    const catalogReady = catalog.status === 'ready' && catalog.value !== null;
    const selectedInCatalog = selected === null || catalog.value === null
        ? true
        : catalogContains(catalog.value, selected);
    const fallback = status.value?.lastFallback;
    const grouped = useMemo(() => groupCatalog(catalog.value, search, active, selected), [catalog.value, search, active, selected]);
    const flat = useMemo(() => grouped.flatMap(group => group.options), [grouped]);
    const boundedIndex = flat.length === 0 ? 0 : Math.min(activeIndex, flat.length - 1);
    const activeOption = flat[boundedIndex];
    const listId = `${fieldId}-model-list`;
    const activeOptionId = activeOption === undefined ? undefined : optionId(fieldId, activeOption.index);
    const openPicker = () => {
        setPickerOpen(true);
        setSearch('');
        setActiveIndex(0);
    };
    const choose = (provider, model) => {
        setDraft(current => ({ ...current, mode: 'override', override: { provider, model } }));
        setDirty(true);
        setSaveState('idle');
        setPickerOpen(false);
        triggerRef.current?.focus();
    };
    const clear = () => {
        setDraft(current => ({ ...current, mode: 'follow', override: null }));
        setDirty(true);
        setSaveState('idle');
    };
    const edit = (field, value) => {
        setDraft(current => ({ ...current, [field]: value }));
        setDirty(true);
        setSaveState('idle');
    };
    const discard = () => {
        setDraft(accepted ?? DEFAULT_DRAFT);
        setDirty(false);
        setSaveState('idle');
    };
    const save = async () => {
        const target = formRef.current;
        if (target === undefined || !dirty || invalid || !writable || saveState === 'saving')
            return;
        const revision = target.state.revision;
        setSaveState('saving');
        const ops = [
            { op: 'set', path: ['maxChars'], value: Number(draft.maxChars) },
            { op: 'set', path: ['maxTokens'], value: Number(draft.maxTokens) },
            selected === null
                ? { op: 'unset', path: ['modelOverride'] }
                : { op: 'set', path: ['modelOverride'], value: { provider: selected.provider, model: selected.model } },
        ];
        try {
            const acceptedByHost = await target.mutate(ops, revision);
            if (acceptedByHost) {
                setDirty(false);
                setSaveState('saved');
                return;
            }
            const current = formRef.current?.state;
            setSaveState(current?.revision !== undefined && revision !== undefined && current.revision !== revision
                ? 'conflict'
                : 'rejected');
        }
        catch {
            setSaveState('failed');
        }
    };
    const onPickerKeyDown = (event) => {
        if (event.key === 'Escape') {
            event.preventDefault();
            setPickerOpen(false);
            triggerRef.current?.focus();
            return;
        }
        // Enter and arrow traversal belong to the search field. A focused Retry or
        // provider row keeps its own native keyboard behavior.
        if (event.target !== searchRef.current)
            return;
        if (event.key === 'ArrowDown') {
            event.preventDefault();
            setActiveIndex(index => flat.length === 0 ? 0 : Math.min(index + 1, flat.length - 1));
            return;
        }
        if (event.key === 'ArrowUp') {
            event.preventDefault();
            setActiveIndex(index => flat.length === 0 ? 0 : Math.max(index - 1, 0));
            return;
        }
        if (event.key === 'Enter' && activeOption !== undefined) {
            event.preventDefault();
            choose(activeOption.provider, activeOption.model.id);
        }
    };
    useEffect(() => {
        if (!pickerOpen)
            return;
        const option = activeOption === undefined ? null : document.getElementById(optionId(fieldId, activeOption.index));
        if (option !== null && typeof option.scrollIntoView === 'function') {
            option.scrollIntoView({ block: 'nearest' });
        }
    }, [activeOption, fieldId, pickerOpen]);
    if (form === undefined)
        return _jsx("p", { className: css.muted, role: "status", children: t('unavailable') });
    if (form.state.status === 'loading' || form.state.value === undefined) {
        return _jsx("p", { className: css.muted, role: "status", children: t('loading') });
    }
    if (form.state.status === 'unavailable')
        return _jsx("p", { className: css.muted, role: "status", children: t('unavailable') });
    return (_jsxs("form", { className: css.page, onSubmit: (event) => { event.preventDefault(); void save(); }, children: [_jsxs("section", { className: css.section, "aria-labelledby": `${fieldId}-status-title`, children: [_jsx("h4", { id: `${fieldId}-status-title`, className: css.sectionTitle, children: t('currentStatus') }), _jsxs("dl", { className: css.statusGrid, children: [_jsxs("div", { className: css.statusItem, children: [_jsx("dt", { className: css.statusLabel, children: t('active') }), _jsxs("dd", { className: css.statusValue, children: [_jsx("span", { className: css.source, children: sourceLabel(activeSource, t) }), active === null ? _jsx("span", { className: css.mutedValue, children: t('activeSourceNone') }) : _jsx(RouteValue, { value: active })] })] }), _jsxs("div", { className: css.statusItem, children: [_jsx("dt", { className: css.statusLabel, children: t('effective') }), _jsx("dd", { className: css.statusValue, children: effective === null ? _jsx("span", { className: css.mutedValue, children: t('activeSourceNone') }) : _jsx(RouteValue, { value: effective }) })] }), selected !== null && (_jsxs("div", { className: css.statusItem, children: [_jsx("dt", { className: css.statusLabel, children: t('configured') }), _jsx("dd", { className: css.statusValue, children: _jsx(RouteValue, { value: selected }) })] }))] }), sessionId === undefined && _jsx("p", { className: css.notice, children: t('unboundSession') }), status.status === 'loading' && _jsx("p", { className: css.muted, role: "status", children: t('statusLoading') }), status.status === 'error' && (_jsxs("p", { className: css.notice, role: "status", children: [t('statusUnavailable'), status.error === null ? null : ` ${status.error}`] })), status.status === 'ready' && effective === null && (_jsx("p", { className: css.alert, role: "alert", children: t('noModelError') }))] }), _jsxs("fieldset", { className: css.section, disabled: disabled, children: [_jsx("legend", { className: css.sectionTitle, children: t('modelMode') }), _jsxs("label", { className: css.modeOption, children: [_jsx("input", { type: "radio", name: "summary-model-mode", checked: draft.mode === 'follow', onChange: clear }), _jsxs("span", { children: [_jsx("span", { className: css.modeTitle, children: t('followModel') }), _jsx("span", { className: css.hint, children: t('followModelHint') })] })] }), _jsxs("label", { className: css.modeOption, children: [_jsx("input", { type: "radio", name: "summary-model-mode", checked: draft.mode === 'override', onChange: () => {
                                    setDraft(current => ({ ...current, mode: 'override' }));
                                    setDirty(true);
                                    setSaveState('idle');
                                } }), _jsxs("span", { children: [_jsx("span", { className: css.modeTitle, children: t('overrideModel') }), _jsx("span", { className: css.hint, children: t('overrideModelHint') })] })] }), draft.mode === 'override' && (_jsxs("div", { className: css.selector, ref: selectorRef, children: [_jsxs("button", { ref: triggerRef, type: "button", className: css.trigger, disabled: disabled, "aria-haspopup": "listbox", "aria-expanded": pickerOpen, "aria-controls": pickerOpen ? listId : undefined, onClick: () => { if (pickerOpen)
                                    setPickerOpen(false);
                                else
                                    openPicker(); }, children: [_jsx("span", { className: css.triggerText, children: selected === null ? t('chooseModel') : _jsx(RouteValue, { value: selected }) }), _jsx("span", { className: css.triggerAction, children: selected === null ? t('chooseModel') : t('changeModel') })] }), selected !== null && (_jsx("button", { type: "button", className: css.clearButton, disabled: disabled, onClick: clear, children: t('clearModel') })), pickerOpen && (_jsxs("div", { className: css.picker, role: "dialog", "aria-label": t('modelPicker'), onKeyDown: onPickerKeyDown, children: [_jsx("input", { ref: searchRef, className: css.search, type: "search", role: "combobox", "aria-expanded": "true", "aria-controls": listId, "aria-autocomplete": "list", "aria-activedescendant": activeOptionId, placeholder: t('searchModels'), "aria-label": t('searchModels'), value: search, onChange: (event) => { setSearch(event.target.value); setActiveIndex(0); } }), catalog.refreshing && _jsx("p", { className: css.muted, role: "status", children: t('catalogRefreshing') }), catalog.status === 'loading' && catalog.value === null && (_jsx("p", { className: css.muted, role: "status", children: t('catalogLoading') })), catalog.status === 'error' && (_jsxs("div", { className: css.failure, role: "alert", children: [_jsx("p", { children: t('catalogFailed') }), _jsx("button", { type: "button", className: css.retry, onClick: () => { void refreshCatalog(); }, children: t('retry') })] })), catalogReady && (_jsxs(_Fragment, { children: [grouped.length === 0 && _jsx("p", { className: css.muted, children: t('noModels') }), _jsx("div", { className: css.list, id: listId, role: "listbox", "aria-label": t('modelPicker'), children: grouped.map(group => (_jsxs("div", { className: css.providerGroup, role: "group", "aria-label": group.name, children: [_jsx("div", { className: css.providerName, children: group.name }), group.options.map(option => (_jsxs("button", { id: optionId(fieldId, option.index), type: "button", role: "option", "aria-selected": option.selected, className: option.index === boundedIndex ? css.optionActive : css.option, onMouseEnter: () => { setActiveIndex(option.index); }, onClick: () => { choose(option.provider, option.model.id); }, children: [_jsxs("span", { className: css.optionMain, children: [_jsxs("span", { className: css.optionName, children: [option.model.name, option.model.badge !== undefined && (_jsx("span", { className: css.badge, "data-tone": option.model.badge.tone, children: props.resolveText(option.model.badge.text) }))] }), _jsxs("span", { className: css.route, children: [option.provider, "/", option.model.id] })] }), _jsxs("span", { className: css.marks, children: [option.active && _jsx("span", { className: css.mark, children: t(activeSource === 'default' ? 'currentDefaultBadge' : 'currentBadge') }), option.selected && _jsx("span", { className: css.mark, children: t('selectedBadge') })] })] }, `${group.id}/${option.model.id}`)))] }, group.id))) }), catalog.value !== null && catalog.value.failures.length > 0 && (_jsx("div", { className: css.failures, children: catalog.value.failures.map(failure => (_jsxs("div", { className: css.failure, role: "status", children: [_jsx("p", { children: t('providerFailed', { provider: failure.name, message: failure.message }) }), _jsx("button", { type: "button", className: css.retry, onClick: () => { void refreshCatalog(); }, children: t('retry') })] }, failure.id))) })), catalog.value !== null && catalog.value.groups.length === 0 && catalog.value.failures.length === 0 && (_jsx("p", { className: css.muted, children: t('noCatalog') }))] }))] }))] }))] }), _jsxs("section", { className: css.section, "aria-labelledby": `${fieldId}-limits`, children: [_jsx("h4", { id: `${fieldId}-limits`, className: css.sectionTitle, children: t('limitsTitle') }), _jsxs("div", { className: css.fields, children: [_jsxs("label", { className: css.field, children: [_jsx("span", { className: css.fieldLabel, children: t('maxChars') }), _jsx("input", { className: charsInvalid ? css.inputInvalid : css.input, type: "text", inputMode: "numeric", value: draft.maxChars, disabled: disabled, "aria-invalid": charsInvalid, "aria-describedby": `${fieldId}-chars-message`, onChange: (event) => { edit('maxChars', event.target.value); } }), _jsx("span", { id: `${fieldId}-chars-message`, className: charsInvalid ? css.invalidText : css.hint, children: charsInvalid ? t('invalidChars') : t('maxCharsHint') })] }), _jsxs("label", { className: css.field, children: [_jsx("span", { className: css.fieldLabel, children: t('maxTokens') }), _jsx("input", { className: tokensInvalid ? css.inputInvalid : css.input, type: "text", inputMode: "numeric", value: draft.maxTokens, disabled: disabled, "aria-invalid": tokensInvalid, "aria-describedby": `${fieldId}-tokens-message`, onChange: (event) => { edit('maxTokens', event.target.value); } }), _jsx("span", { id: `${fieldId}-tokens-message`, className: tokensInvalid ? css.invalidText : css.hint, children: tokensInvalid ? t('invalidTokens') : t('maxTokensHint') })] })] })] }), overrideInvalid && _jsx("p", { className: css.alert, role: "alert", children: t('overrideRequired') }), selected !== null && catalogReady && !selectedInCatalog && (_jsx("p", { className: css.alert, role: "alert", children: t('missingRouteWarning') })), catalog.error !== null && (_jsxs("div", { className: css.alert, role: "alert", children: [_jsx("span", { children: t('catalogWarning') }), _jsx("button", { type: "button", className: css.retry, onClick: () => { void refreshCatalog(); }, children: t('retry') })] })), fallback !== undefined && (_jsx("p", { className: css.alert, role: "alert", children: t('fallbackWarning', {
                    from: routeOf(fallback.from),
                    to: routeOf(fallback.to),
                    time: formatTime(fallback.at),
                    reason: fallback.reason,
                }) })), !writable && _jsx("p", { className: css.notice, role: "status", children: t('readOnly') }), _jsxs("div", { className: css.actions, children: [_jsxs("span", { className: css.saveState, role: "status", "aria-live": "polite", children: [saveState === 'saved' ? t('saved') : null, saveState === 'rejected' ? t('rejected') : null, saveState === 'conflict' ? t('conflict') : null, saveState === 'failed' ? t('saveFailed') : null] }), _jsx("button", { type: "button", className: css.secondary, disabled: !dirty || saveState === 'saving', onClick: discard, children: t('discard') }), _jsx("button", { type: "submit", className: css.primary, disabled: !dirty || invalid || !writable || saveState === 'saving', children: saveState === 'saving' ? t('saving') : t('save') })] })] }));
}
function RouteValue({ value }) {
    return _jsxs("code", { className: css.route, children: [value.provider, "/", value.model] });
}
function sourceLabel(source, t) {
    switch (source) {
        case 'session': return t('activeSourceSession');
        case 'default': return t('activeSourceDefault');
        case 'none': return t('activeSourceNone');
    }
}
function readDraft(snapshot) {
    const value = snapshot?.value;
    if (value === undefined)
        return undefined;
    const maxChars = typeof value.maxChars === 'number' || typeof value.maxChars === 'string'
        ? String(value.maxChars) : DEFAULT_DRAFT.maxChars;
    const maxTokens = typeof value.maxTokens === 'number' || typeof value.maxTokens === 'string'
        ? String(value.maxTokens) : DEFAULT_DRAFT.maxTokens;
    const override = value.modelOverride;
    if (isComplete(override))
        return { maxChars, maxTokens, mode: 'override', override };
    if (override === undefined || override === null)
        return { maxChars, maxTokens, mode: 'follow', override: null };
    return { maxChars, maxTokens, mode: 'override', override: null };
}
function sameDraft(left, right) {
    return left.maxChars === right.maxChars
        && left.maxTokens === right.maxTokens
        && left.mode === right.mode
        && left.override?.provider === right.override?.provider
        && left.override?.model === right.override?.model;
}
function isComplete(value) {
    return typeof value === 'object' && value !== null
        && typeof value.provider === 'string'
        && value.provider !== ''
        && typeof value.model === 'string'
        && value.model !== '';
}
function isIntegerInRange(text, minimum, maximum) {
    if (!/^\d+$/u.test(text.trim()))
        return false;
    const value = Number(text);
    return Number.isSafeInteger(value) && value >= minimum && value <= maximum;
}
function routeOf(value) {
    return `${value.provider}/${value.model}`;
}
function catalogContains(catalog, selection) {
    return catalog.groups.some(group => group.id === selection.provider
        && group.models.some(model => model.id === selection.model));
}
function groupCatalog(catalog, search, active, selected) {
    const query = search.trim().toLowerCase();
    const groups = [];
    let index = 0;
    for (const group of catalog?.groups ?? []) {
        const models = group.models.filter(model => query === ''
            || model.name.toLowerCase().includes(query)
            || model.id.toLowerCase().includes(query)
            || group.name.toLowerCase().includes(query)
            || group.id.toLowerCase().includes(query));
        if (models.length === 0)
            continue;
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
        });
    }
    return groups;
}
function optionId(fieldId, index) {
    return `${fieldId}-model-option-${index}`;
}
function messageOf(error) {
    return error instanceof Error ? error.message : String(error);
}
function formatTime(at) {
    const date = new Date(at);
    if (Number.isNaN(date.getTime()))
        return String(at);
    return date.toLocaleString();
}
//# sourceMappingURL=config-page.js.map