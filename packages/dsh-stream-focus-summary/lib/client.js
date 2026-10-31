window.__ModuleLoader__.load({
	id: "dsh-stream-focus-summary",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		let react_jsx_runtime = require("react/jsx-runtime");
		let react = require("react");
		//#region \0dsh-css:/Users/timho/Development/dsh/dsh-plugins/dsh-stream-focus/packages/dsh-stream-focus-summary/src/client/config-page.module.css.mjs
		const css = ".d3WBKq_page{min-width:0;color:var(--dsw-alias-label-primary);font-size:var(--dsh-content-font-size-secondary,13px);gap:14px;display:grid}.d3WBKq_section{border:.5px solid var(--dsw-alias-border-l3);border-radius:var(--dsw-radius-md);background:var(--dsw-alias-bg-module-platform);min-inline-size:0;margin:0;padding:14px 16px}.d3WBKq_sectionTitle{color:var(--dsw-alias-label-secondary);letter-spacing:.01em;margin:0 0 10px;padding:0;font-size:12px;font-weight:600}fieldset.d3WBKq_section>legend.d3WBKq_sectionTitle{margin-left:-4px;padding:0 4px}.d3WBKq_statusGrid{gap:9px;margin:0;display:grid}.d3WBKq_statusItem{grid-template-columns:88px minmax(0,1fr);align-items:baseline;gap:10px;display:grid}.d3WBKq_statusLabel{color:var(--dsw-alias-label-tertiary);font-size:12px}.d3WBKq_statusValue{min-width:0;color:var(--dsw-alias-label-primary);flex-wrap:wrap;align-items:center;gap:6px;margin:0;display:flex}.d3WBKq_source{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-secondary);white-space:nowrap;border-radius:999px;align-items:center;padding:1px 6px;font-size:11px;display:inline-flex}.d3WBKq_mutedValue{color:var(--dsw-alias-label-tertiary)}.d3WBKq_route{color:var(--dsw-alias-label-tertiary);font-family:var(--dsw-font-family-mono,ui-monospace, SFMono-Regular, Menlo, monospace);overflow-wrap:anywhere;font-size:11px}.d3WBKq_notice{color:var(--dsw-alias-label-tertiary);margin:9px 0 0;font-size:12px;line-height:1.5}.d3WBKq_alert{border:.5px solid var(--dsw-alias-border-l3);border-radius:var(--dsw-radius-sm);background:var(--dsw-alias-bg-base);color:var(--dsw-alias-state-warn-label);justify-content:space-between;align-items:center;gap:8px;margin:9px 0 0;padding:9px 11px;font-size:12px;line-height:1.5;display:flex}.d3WBKq_modeOption{border-radius:var(--dsw-radius-sm);cursor:pointer;align-items:flex-start;gap:9px;margin:0 -6px;padding:8px 6px;display:flex}.d3WBKq_modeOption:hover{background:var(--dsw-alias-interactive-bg-hover)}.d3WBKq_modeOption input{accent-color:var(--dsw-alias-state-business-primary);margin:2px 0 0}.d3WBKq_modeTitle{color:var(--dsw-alias-label-primary);font-weight:500;display:block}.d3WBKq_hint{color:var(--dsw-alias-label-tertiary);font-size:12px;line-height:1.5;display:block}.d3WBKq_selector{gap:7px;margin-top:10px;display:grid;position:relative}.d3WBKq_trigger{box-sizing:border-box;border:.5px solid var(--dsw-alias-border-l3);border-radius:var(--dsw-radius-sm);background:var(--dsw-alias-bg-base);width:100%;color:var(--dsw-alias-label-primary);font:inherit;text-align:left;cursor:pointer;justify-content:space-between;align-items:center;gap:12px;padding:9px 11px;display:flex}.d3WBKq_trigger:hover{background:var(--dsw-alias-interactive-bg-hover)}.d3WBKq_trigger:focus-visible,.d3WBKq_clearButton:focus-visible,.d3WBKq_option:focus-visible,.d3WBKq_optionActive:focus-visible,.d3WBKq_retry:focus-visible,.d3WBKq_primary:focus-visible,.d3WBKq_secondary:focus-visible,.d3WBKq_search:focus-visible,.d3WBKq_input:focus-visible,.d3WBKq_inputInvalid:focus-visible{box-shadow:0 0 0 2px var(--dsw-focus-ring-color,var(--dsw-alias-state-business-primary));outline:none}.d3WBKq_triggerText{text-overflow:ellipsis;white-space:nowrap;min-width:0;overflow:hidden}.d3WBKq_triggerAction{color:var(--dsw-alias-label-secondary);flex:none;font-size:12px}.d3WBKq_clearButton{color:var(--dsw-alias-label-secondary);font:inherit;cursor:pointer;background:0 0;border:0;justify-self:start;padding:0;font-size:12px;text-decoration:underline}.d3WBKq_picker{border:.5px solid var(--dsw-alias-border-l3);border-radius:var(--dsw-radius-md);background:var(--dsw-alias-bg-base);box-shadow:var(--dsw-elevation-prominent);gap:7px;padding:10px;display:grid}.d3WBKq_search,.d3WBKq_input,.d3WBKq_inputInvalid{box-sizing:border-box;border:.5px solid var(--dsw-alias-border-l3);border-radius:var(--dsw-radius-sm);background:var(--dsw-alias-bg-base);width:100%;color:var(--dsw-alias-label-primary);font:inherit;padding:8px 10px}.d3WBKq_search::placeholder{color:var(--dsw-alias-label-tertiary)}.d3WBKq_inputInvalid{border-color:var(--dsw-alias-state-error-primary)}.d3WBKq_list{overscroll-behavior:contain;gap:2px;max-height:320px;display:grid;overflow-y:auto}.d3WBKq_providerGroup{gap:1px;min-width:0;display:grid}.d3WBKq_providerName{color:var(--dsw-alias-label-tertiary);padding:7px 8px 3px;font-size:11px;font-weight:600}.d3WBKq_option,.d3WBKq_optionActive{border-radius:var(--dsw-radius-sm);width:100%;color:var(--dsw-alias-label-primary);font:inherit;text-align:left;cursor:pointer;background:0 0;border:0;justify-content:space-between;align-items:center;gap:10px;padding:7px 8px;display:flex}.d3WBKq_option:hover,.d3WBKq_optionActive{background:var(--dsw-alias-interactive-bg-hover)}.d3WBKq_optionMain{gap:1px;min-width:0;display:grid}.d3WBKq_optionName{text-overflow:ellipsis;white-space:nowrap;align-items:center;gap:6px;min-width:0;display:flex;overflow:hidden}.d3WBKq_badge{border:.5px solid var(--dsw-alias-border-l3);color:var(--dsw-alias-label-secondary);border-radius:999px;flex:none;padding:0 5px;font-size:10px;line-height:16px}.d3WBKq_badge[data-tone=info]{color:var(--dsw-alias-state-business-primary)}.d3WBKq_badge[data-tone=success]{color:var(--dsw-alias-state-success-primary)}.d3WBKq_badge[data-tone=warning]{color:var(--dsw-alias-state-warn-label)}.d3WBKq_marks{flex-wrap:wrap;flex:none;justify-content:flex-end;gap:4px;display:flex}.d3WBKq_mark{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-secondary);white-space:nowrap;border-radius:999px;padding:1px 5px;font-size:10px}.d3WBKq_failures{gap:6px;display:grid}.d3WBKq_failure{border:.5px solid var(--dsw-alias-border-l3);border-radius:var(--dsw-radius-sm);color:var(--dsw-alias-state-warn-label);justify-content:space-between;align-items:center;gap:8px;padding:8px;font-size:12px;display:flex}.d3WBKq_failure p{margin:0}.d3WBKq_alert>span{min-width:0}.d3WBKq_retry{border:.5px solid var(--dsw-alias-border-l3);border-radius:var(--dsw-radius-sm);color:var(--dsw-alias-label-primary);font:inherit;cursor:pointer;background:0 0;flex:none;padding:4px 8px;font-size:12px}.d3WBKq_fields{grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:14px;display:grid}.d3WBKq_field{gap:5px;min-width:0;display:grid}.d3WBKq_fieldLabel{color:var(--dsw-alias-label-secondary);font-size:12px;font-weight:500}.d3WBKq_invalidText{color:var(--dsw-alias-state-error-primary);font-size:12px;line-height:1.5}.d3WBKq_actions{flex-wrap:wrap;align-items:center;gap:8px;display:flex}.d3WBKq_saveState{min-height:18px;color:var(--dsw-alias-label-secondary);flex:180px;font-size:12px}.d3WBKq_primary,.d3WBKq_secondary{border-radius:var(--dsw-radius-sm);font:inherit;cursor:pointer;padding:7px 14px;font-size:12px}.d3WBKq_primary{background:var(--dsw-alias-button-primary-fill);color:var(--dsw-alias-label-primary-foreground);border:0}.d3WBKq_primary:hover:not(:disabled){background:var(--dsw-alias-button-primary-hover)}.d3WBKq_secondary{border:.5px solid var(--dsw-alias-border-l3);color:var(--dsw-alias-label-primary);background:0 0}.d3WBKq_primary:disabled,.d3WBKq_secondary:disabled,.d3WBKq_trigger:disabled,.d3WBKq_clearButton:disabled,.d3WBKq_retry:disabled{cursor:default;opacity:.5}.d3WBKq_muted{color:var(--dsw-alias-label-tertiary);margin:0;font-size:12px}@media (width<=520px){.d3WBKq_statusItem{grid-template-columns:1fr;gap:2px}}";
		const tagId = "dsh-stream-focus-summary/config-page.module.css";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId) + "]") === null) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "dsh-stream-focus-summary";
			tag.dataset.pluginCss = tagId;
			tag.textContent = css;
			document.head.appendChild(tag);
		}
		var config_page_module_css_default = {
			"actions": "d3WBKq_actions",
			"alert": "d3WBKq_alert",
			"badge": "d3WBKq_badge",
			"clearButton": "d3WBKq_clearButton",
			"failure": "d3WBKq_failure",
			"failures": "d3WBKq_failures",
			"field": "d3WBKq_field",
			"fieldLabel": "d3WBKq_fieldLabel",
			"fields": "d3WBKq_fields",
			"hint": "d3WBKq_hint",
			"input": "d3WBKq_input",
			"inputInvalid": "d3WBKq_inputInvalid",
			"invalidText": "d3WBKq_invalidText",
			"list": "d3WBKq_list",
			"mark": "d3WBKq_mark",
			"marks": "d3WBKq_marks",
			"modeOption": "d3WBKq_modeOption",
			"modeTitle": "d3WBKq_modeTitle",
			"muted": "d3WBKq_muted",
			"mutedValue": "d3WBKq_mutedValue",
			"notice": "d3WBKq_notice",
			"option": "d3WBKq_option",
			"optionActive": "d3WBKq_optionActive",
			"optionMain": "d3WBKq_optionMain",
			"optionName": "d3WBKq_optionName",
			"page": "d3WBKq_page",
			"picker": "d3WBKq_picker",
			"primary": "d3WBKq_primary",
			"providerGroup": "d3WBKq_providerGroup",
			"providerName": "d3WBKq_providerName",
			"retry": "d3WBKq_retry",
			"route": "d3WBKq_route",
			"saveState": "d3WBKq_saveState",
			"search": "d3WBKq_search",
			"secondary": "d3WBKq_secondary",
			"section": "d3WBKq_section",
			"sectionTitle": "d3WBKq_sectionTitle",
			"selector": "d3WBKq_selector",
			"source": "d3WBKq_source",
			"statusGrid": "d3WBKq_statusGrid",
			"statusItem": "d3WBKq_statusItem",
			"statusLabel": "d3WBKq_statusLabel",
			"statusValue": "d3WBKq_statusValue",
			"trigger": "d3WBKq_trigger",
			"triggerAction": "d3WBKq_triggerAction",
			"triggerText": "d3WBKq_triggerText"
		};
		//#endregion
		//#region lib/types/client/config-page.js
		const DEFAULT_DRAFT = {
			maxChars: "30",
			maxTokens: "800",
			mode: "follow",
			override: null
		};
		/**
		* Render the row's one-line description or its full page. `summary` is also
		* the fallback when the plugin manager has no package description.
		* @param props - view, plugin-manager form, and apply-closure data.
		* @returns the requested row configuration view.
		*/
		function SummaryConfigPage(props) {
			if (props.view === "summary") return (0, react_jsx_runtime.jsx)(SummaryBrief, {
				form: props.form,
				t: props.t
			});
			return (0, react_jsx_runtime.jsx)(SummaryConfigForm, { ...props });
		}
		function SummaryBrief({ form, t }) {
			const accepted = readDraft(form?.state);
			if (accepted?.mode === "override" && accepted.override !== null) return (0, react_jsx_runtime.jsx)("span", { children: t("summaryOverride", { route: routeOf(accepted.override) }) });
			return (0, react_jsx_runtime.jsx)("span", { children: t("summaryFollow") });
		}
		function SummaryConfigForm(props) {
			const { form, t } = props;
			const fieldId = (0, react.useId)().replaceAll(":", "");
			const accepted = (0, react.useMemo)(() => readDraft(form?.state), [form?.state]);
			const [draft, setDraft] = (0, react.useState)(accepted ?? DEFAULT_DRAFT);
			const [dirty, setDirty] = (0, react.useState)(false);
			const [saveState, setSaveState] = (0, react.useState)("idle");
			const [catalog, setCatalog] = (0, react.useState)({
				value: null,
				status: "loading",
				error: null,
				refreshing: false
			});
			const [status, setStatus] = (0, react.useState)({
				value: null,
				status: "loading",
				error: null
			});
			const [sessionId, setSessionId] = (0, react.useState)(() => props.activeSessionId());
			const [statusRevision, setStatusRevision] = (0, react.useState)(0);
			const [, setLocaleRevision] = (0, react.useState)(0);
			const [pickerOpen, setPickerOpen] = (0, react.useState)(false);
			const [search, setSearch] = (0, react.useState)("");
			const [activeIndex, setActiveIndex] = (0, react.useState)(0);
			const formRef = (0, react.useRef)(form);
			formRef.current = form;
			const statusToken = (0, react.useRef)(0);
			const catalogToken = (0, react.useRef)(0);
			const triggerRef = (0, react.useRef)(null);
			const searchRef = (0, react.useRef)(null);
			const selectorRef = (0, react.useRef)(null);
			(0, react.useEffect)(() => {
				if (!dirty && accepted !== void 0) setDraft((current) => sameDraft(current, accepted) ? current : accepted);
			}, [accepted, dirty]);
			(0, react.useEffect)(() => {
				return props.subscribeLocale(() => {
					setLocaleRevision((value) => value + 1);
				});
			}, [props.subscribeLocale]);
			(0, react.useEffect)(() => {
				setSessionId(props.activeSessionId());
				return props.subscribeActiveSession(() => {
					setSessionId(props.activeSessionId());
				});
			}, [props.activeSessionId, props.subscribeActiveSession]);
			const loadCatalog = props.loadCatalog;
			const refreshCatalog = (0, react.useMemo)(() => async () => {
				const token = ++catalogToken.current;
				setCatalog((current) => ({
					...current,
					status: current.value === null ? "loading" : current.status,
					refreshing: current.value !== null,
					error: null
				}));
				try {
					const value = await loadCatalog();
					if (token !== catalogToken.current) return;
					setCatalog({
						value,
						status: "ready",
						error: null,
						refreshing: false
					});
				} catch (error) {
					if (token !== catalogToken.current) return;
					setCatalog((current) => ({
						...current,
						status: current.value === null ? "error" : "ready",
						error: messageOf(error),
						refreshing: false
					}));
				}
			}, [loadCatalog]);
			(0, react.useEffect)(() => {
				refreshCatalog();
				return props.subscribeModelUpdates(() => {
					refreshCatalog();
					setStatusRevision((value) => value + 1);
				});
			}, [props.subscribeModelUpdates, refreshCatalog]);
			const loadStatus = props.loadStatus;
			(0, react.useEffect)(() => {
				const token = ++statusToken.current;
				setStatus((current) => ({
					...current,
					status: "loading",
					error: null
				}));
				loadStatus(sessionId).then((value) => {
					if (token !== statusToken.current) return;
					setStatus({
						value,
						status: "ready",
						error: null
					});
				}, (error) => {
					if (token !== statusToken.current) return;
					setStatus({
						value: null,
						status: "error",
						error: messageOf(error)
					});
				});
			}, [
				loadStatus,
				sessionId,
				statusRevision
			]);
			(0, react.useEffect)(() => {
				if (!pickerOpen) return;
				const onPointerDown = (event) => {
					const target = event.target;
					if (!(target instanceof Node)) return;
					if (selectorRef.current?.contains(target) === true) return;
					setPickerOpen(false);
				};
				document.addEventListener("pointerdown", onPointerDown);
				return () => {
					document.removeEventListener("pointerdown", onPointerDown);
				};
			}, [pickerOpen]);
			(0, react.useEffect)(() => {
				if (!pickerOpen) return;
				searchRef.current?.focus();
			}, [pickerOpen]);
			const charsInvalid = !isIntegerInRange(draft.maxChars, 10, 80);
			const tokensInvalid = !isIntegerInRange(draft.maxTokens, 256, 4e3);
			const overrideInvalid = draft.mode === "override" && !isComplete(draft.override);
			const invalid = charsInvalid || tokensInvalid || overrideInvalid;
			const writable = form?.state.writable === true;
			const disabled = !writable || saveState === "saving";
			const active = status.value?.active ?? null;
			const effective = status.value?.effective ?? null;
			const selected = draft.mode === "override" ? draft.override : null;
			const activeSource = status.value?.activeSource ?? "none";
			const catalogReady = catalog.status === "ready" && catalog.value !== null;
			const selectedInCatalog = selected === null || catalog.value === null ? true : catalogContains(catalog.value, selected);
			const fallback = status.value?.lastFallback;
			const grouped = (0, react.useMemo)(() => groupCatalog(catalog.value, search, active, selected), [
				catalog.value,
				search,
				active,
				selected
			]);
			const flat = (0, react.useMemo)(() => grouped.flatMap((group) => group.options), [grouped]);
			const boundedIndex = flat.length === 0 ? 0 : Math.min(activeIndex, flat.length - 1);
			const activeOption = flat[boundedIndex];
			const listId = `${fieldId}-model-list`;
			const activeOptionId = activeOption === void 0 ? void 0 : optionId(fieldId, activeOption.index);
			const openPicker = () => {
				setPickerOpen(true);
				setSearch("");
				setActiveIndex(0);
			};
			const choose = (provider, model) => {
				setDraft((current) => ({
					...current,
					mode: "override",
					override: {
						provider,
						model
					}
				}));
				setDirty(true);
				setSaveState("idle");
				setPickerOpen(false);
				triggerRef.current?.focus();
			};
			const clear = () => {
				setDraft((current) => ({
					...current,
					mode: "follow",
					override: null
				}));
				setDirty(true);
				setSaveState("idle");
			};
			const edit = (field, value) => {
				setDraft((current) => ({
					...current,
					[field]: value
				}));
				setDirty(true);
				setSaveState("idle");
			};
			const discard = () => {
				setDraft(accepted ?? DEFAULT_DRAFT);
				setDirty(false);
				setSaveState("idle");
			};
			const save = async () => {
				const target = formRef.current;
				if (target === void 0 || !dirty || invalid || !writable || saveState === "saving") return;
				const revision = target.state.revision;
				setSaveState("saving");
				const ops = [
					{
						op: "set",
						path: ["maxChars"],
						value: Number(draft.maxChars)
					},
					{
						op: "set",
						path: ["maxTokens"],
						value: Number(draft.maxTokens)
					},
					selected === null ? {
						op: "unset",
						path: ["modelOverride"]
					} : {
						op: "set",
						path: ["modelOverride"],
						value: {
							provider: selected.provider,
							model: selected.model
						}
					}
				];
				try {
					if (await target.mutate(ops, revision)) {
						setDirty(false);
						setSaveState("saved");
						return;
					}
					const current = formRef.current?.state;
					setSaveState(current?.revision !== void 0 && revision !== void 0 && current.revision !== revision ? "conflict" : "rejected");
				} catch {
					setSaveState("failed");
				}
			};
			const onPickerKeyDown = (event) => {
				if (event.key === "Escape") {
					event.preventDefault();
					setPickerOpen(false);
					triggerRef.current?.focus();
					return;
				}
				if (event.target !== searchRef.current) return;
				if (event.key === "ArrowDown") {
					event.preventDefault();
					setActiveIndex((index) => flat.length === 0 ? 0 : Math.min(index + 1, flat.length - 1));
					return;
				}
				if (event.key === "ArrowUp") {
					event.preventDefault();
					setActiveIndex((index) => flat.length === 0 ? 0 : Math.max(index - 1, 0));
					return;
				}
				if (event.key === "Enter" && activeOption !== void 0) {
					event.preventDefault();
					choose(activeOption.provider, activeOption.model.id);
				}
			};
			(0, react.useEffect)(() => {
				if (!pickerOpen) return;
				const option = activeOption === void 0 ? null : document.getElementById(optionId(fieldId, activeOption.index));
				if (option !== null && typeof option.scrollIntoView === "function") option.scrollIntoView({ block: "nearest" });
			}, [
				activeOption,
				fieldId,
				pickerOpen
			]);
			if (form === void 0) return (0, react_jsx_runtime.jsx)("p", {
				className: config_page_module_css_default.muted,
				role: "status",
				children: t("unavailable")
			});
			if (form.state.status === "loading" || form.state.value === void 0) return (0, react_jsx_runtime.jsx)("p", {
				className: config_page_module_css_default.muted,
				role: "status",
				children: t("loading")
			});
			if (form.state.status === "unavailable") return (0, react_jsx_runtime.jsx)("p", {
				className: config_page_module_css_default.muted,
				role: "status",
				children: t("unavailable")
			});
			return (0, react_jsx_runtime.jsxs)("form", {
				className: config_page_module_css_default.page,
				onSubmit: (event) => {
					event.preventDefault();
					save();
				},
				children: [
					(0, react_jsx_runtime.jsxs)("section", {
						className: config_page_module_css_default.section,
						"aria-labelledby": `${fieldId}-status-title`,
						children: [
							(0, react_jsx_runtime.jsx)("h4", {
								id: `${fieldId}-status-title`,
								className: config_page_module_css_default.sectionTitle,
								children: t("currentStatus")
							}),
							(0, react_jsx_runtime.jsxs)("dl", {
								className: config_page_module_css_default.statusGrid,
								children: [
									(0, react_jsx_runtime.jsxs)("div", {
										className: config_page_module_css_default.statusItem,
										children: [(0, react_jsx_runtime.jsx)("dt", {
											className: config_page_module_css_default.statusLabel,
											children: t("active")
										}), (0, react_jsx_runtime.jsxs)("dd", {
											className: config_page_module_css_default.statusValue,
											children: [(0, react_jsx_runtime.jsx)("span", {
												className: config_page_module_css_default.source,
												children: sourceLabel(activeSource, t)
											}), active === null ? (0, react_jsx_runtime.jsx)("span", {
												className: config_page_module_css_default.mutedValue,
												children: t("activeSourceNone")
											}) : (0, react_jsx_runtime.jsx)(RouteValue, { value: active })]
										})]
									}),
									(0, react_jsx_runtime.jsxs)("div", {
										className: config_page_module_css_default.statusItem,
										children: [(0, react_jsx_runtime.jsx)("dt", {
											className: config_page_module_css_default.statusLabel,
											children: t("effective")
										}), (0, react_jsx_runtime.jsx)("dd", {
											className: config_page_module_css_default.statusValue,
											children: effective === null ? (0, react_jsx_runtime.jsx)("span", {
												className: config_page_module_css_default.mutedValue,
												children: t("activeSourceNone")
											}) : (0, react_jsx_runtime.jsx)(RouteValue, { value: effective })
										})]
									}),
									selected !== null && (0, react_jsx_runtime.jsxs)("div", {
										className: config_page_module_css_default.statusItem,
										children: [(0, react_jsx_runtime.jsx)("dt", {
											className: config_page_module_css_default.statusLabel,
											children: t("configured")
										}), (0, react_jsx_runtime.jsx)("dd", {
											className: config_page_module_css_default.statusValue,
											children: (0, react_jsx_runtime.jsx)(RouteValue, { value: selected })
										})]
									})
								]
							}),
							sessionId === void 0 && (0, react_jsx_runtime.jsx)("p", {
								className: config_page_module_css_default.notice,
								children: t("unboundSession")
							}),
							status.status === "loading" && (0, react_jsx_runtime.jsx)("p", {
								className: config_page_module_css_default.muted,
								role: "status",
								children: t("statusLoading")
							}),
							status.status === "error" && (0, react_jsx_runtime.jsxs)("p", {
								className: config_page_module_css_default.notice,
								role: "status",
								children: [t("statusUnavailable"), status.error === null ? null : ` ${status.error}`]
							}),
							status.status === "ready" && effective === null && (0, react_jsx_runtime.jsx)("p", {
								className: config_page_module_css_default.alert,
								role: "alert",
								children: t("noModelError")
							})
						]
					}),
					(0, react_jsx_runtime.jsxs)("fieldset", {
						className: config_page_module_css_default.section,
						disabled,
						children: [
							(0, react_jsx_runtime.jsx)("legend", {
								className: config_page_module_css_default.sectionTitle,
								children: t("modelMode")
							}),
							(0, react_jsx_runtime.jsxs)("label", {
								className: config_page_module_css_default.modeOption,
								children: [(0, react_jsx_runtime.jsx)("input", {
									type: "radio",
									name: "summary-model-mode",
									checked: draft.mode === "follow",
									onChange: clear
								}), (0, react_jsx_runtime.jsxs)("span", { children: [(0, react_jsx_runtime.jsx)("span", {
									className: config_page_module_css_default.modeTitle,
									children: t("followModel")
								}), (0, react_jsx_runtime.jsx)("span", {
									className: config_page_module_css_default.hint,
									children: t("followModelHint")
								})] })]
							}),
							(0, react_jsx_runtime.jsxs)("label", {
								className: config_page_module_css_default.modeOption,
								children: [(0, react_jsx_runtime.jsx)("input", {
									type: "radio",
									name: "summary-model-mode",
									checked: draft.mode === "override",
									onChange: () => {
										setDraft((current) => ({
											...current,
											mode: "override"
										}));
										setDirty(true);
										setSaveState("idle");
									}
								}), (0, react_jsx_runtime.jsxs)("span", { children: [(0, react_jsx_runtime.jsx)("span", {
									className: config_page_module_css_default.modeTitle,
									children: t("overrideModel")
								}), (0, react_jsx_runtime.jsx)("span", {
									className: config_page_module_css_default.hint,
									children: t("overrideModelHint")
								})] })]
							}),
							draft.mode === "override" && (0, react_jsx_runtime.jsxs)("div", {
								className: config_page_module_css_default.selector,
								ref: selectorRef,
								children: [
									(0, react_jsx_runtime.jsxs)("button", {
										ref: triggerRef,
										type: "button",
										className: config_page_module_css_default.trigger,
										disabled,
										"aria-haspopup": "listbox",
										"aria-expanded": pickerOpen,
										"aria-controls": pickerOpen ? listId : void 0,
										onClick: () => {
											if (pickerOpen) setPickerOpen(false);
											else openPicker();
										},
										children: [(0, react_jsx_runtime.jsx)("span", {
											className: config_page_module_css_default.triggerText,
											children: selected === null ? t("chooseModel") : (0, react_jsx_runtime.jsx)(RouteValue, { value: selected })
										}), (0, react_jsx_runtime.jsx)("span", {
											className: config_page_module_css_default.triggerAction,
											children: selected === null ? t("chooseModel") : t("changeModel")
										})]
									}),
									selected !== null && (0, react_jsx_runtime.jsx)("button", {
										type: "button",
										className: config_page_module_css_default.clearButton,
										disabled,
										onClick: clear,
										children: t("clearModel")
									}),
									pickerOpen && (0, react_jsx_runtime.jsxs)("div", {
										className: config_page_module_css_default.picker,
										role: "dialog",
										"aria-label": t("modelPicker"),
										onKeyDown: onPickerKeyDown,
										children: [
											(0, react_jsx_runtime.jsx)("input", {
												ref: searchRef,
												className: config_page_module_css_default.search,
												type: "search",
												role: "combobox",
												"aria-expanded": "true",
												"aria-controls": listId,
												"aria-autocomplete": "list",
												"aria-activedescendant": activeOptionId,
												placeholder: t("searchModels"),
												"aria-label": t("searchModels"),
												value: search,
												onChange: (event) => {
													setSearch(event.target.value);
													setActiveIndex(0);
												}
											}),
											catalog.refreshing && (0, react_jsx_runtime.jsx)("p", {
												className: config_page_module_css_default.muted,
												role: "status",
												children: t("catalogRefreshing")
											}),
											catalog.status === "loading" && catalog.value === null && (0, react_jsx_runtime.jsx)("p", {
												className: config_page_module_css_default.muted,
												role: "status",
												children: t("catalogLoading")
											}),
											catalog.status === "error" && (0, react_jsx_runtime.jsxs)("div", {
												className: config_page_module_css_default.failure,
												role: "alert",
												children: [(0, react_jsx_runtime.jsx)("p", { children: t("catalogFailed") }), (0, react_jsx_runtime.jsx)("button", {
													type: "button",
													className: config_page_module_css_default.retry,
													onClick: () => {
														refreshCatalog();
													},
													children: t("retry")
												})]
											}),
											catalogReady && (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [
												grouped.length === 0 && (0, react_jsx_runtime.jsx)("p", {
													className: config_page_module_css_default.muted,
													children: t("noModels")
												}),
												(0, react_jsx_runtime.jsx)("div", {
													className: config_page_module_css_default.list,
													id: listId,
													role: "listbox",
													"aria-label": t("modelPicker"),
													children: grouped.map((group) => (0, react_jsx_runtime.jsxs)("div", {
														className: config_page_module_css_default.providerGroup,
														role: "group",
														"aria-label": group.name,
														children: [(0, react_jsx_runtime.jsx)("div", {
															className: config_page_module_css_default.providerName,
															children: group.name
														}), group.options.map((option) => (0, react_jsx_runtime.jsxs)("button", {
															id: optionId(fieldId, option.index),
															type: "button",
															role: "option",
															"aria-selected": option.selected,
															className: option.index === boundedIndex ? config_page_module_css_default.optionActive : config_page_module_css_default.option,
															onMouseEnter: () => {
																setActiveIndex(option.index);
															},
															onClick: () => {
																choose(option.provider, option.model.id);
															},
															children: [(0, react_jsx_runtime.jsxs)("span", {
																className: config_page_module_css_default.optionMain,
																children: [(0, react_jsx_runtime.jsxs)("span", {
																	className: config_page_module_css_default.optionName,
																	children: [option.model.name, option.model.badge !== void 0 && (0, react_jsx_runtime.jsx)("span", {
																		className: config_page_module_css_default.badge,
																		"data-tone": option.model.badge.tone,
																		children: props.resolveText(option.model.badge.text)
																	})]
																}), (0, react_jsx_runtime.jsxs)("span", {
																	className: config_page_module_css_default.route,
																	children: [
																		option.provider,
																		"/",
																		option.model.id
																	]
																})]
															}), (0, react_jsx_runtime.jsxs)("span", {
																className: config_page_module_css_default.marks,
																children: [option.active && (0, react_jsx_runtime.jsx)("span", {
																	className: config_page_module_css_default.mark,
																	children: t(activeSource === "default" ? "currentDefaultBadge" : "currentBadge")
																}), option.selected && (0, react_jsx_runtime.jsx)("span", {
																	className: config_page_module_css_default.mark,
																	children: t("selectedBadge")
																})]
															})]
														}, `${group.id}/${option.model.id}`))]
													}, group.id))
												}),
												catalog.value !== null && catalog.value.failures.length > 0 && (0, react_jsx_runtime.jsx)("div", {
													className: config_page_module_css_default.failures,
													children: catalog.value.failures.map((failure) => (0, react_jsx_runtime.jsxs)("div", {
														className: config_page_module_css_default.failure,
														role: "status",
														children: [(0, react_jsx_runtime.jsx)("p", { children: t("providerFailed", {
															provider: failure.name,
															message: failure.message
														}) }), (0, react_jsx_runtime.jsx)("button", {
															type: "button",
															className: config_page_module_css_default.retry,
															onClick: () => {
																refreshCatalog();
															},
															children: t("retry")
														})]
													}, failure.id))
												}),
												catalog.value !== null && catalog.value.groups.length === 0 && catalog.value.failures.length === 0 && (0, react_jsx_runtime.jsx)("p", {
													className: config_page_module_css_default.muted,
													children: t("noCatalog")
												})
											] })
										]
									})
								]
							})
						]
					}),
					(0, react_jsx_runtime.jsxs)("section", {
						className: config_page_module_css_default.section,
						"aria-labelledby": `${fieldId}-limits`,
						children: [(0, react_jsx_runtime.jsx)("h4", {
							id: `${fieldId}-limits`,
							className: config_page_module_css_default.sectionTitle,
							children: t("limitsTitle")
						}), (0, react_jsx_runtime.jsxs)("div", {
							className: config_page_module_css_default.fields,
							children: [(0, react_jsx_runtime.jsxs)("label", {
								className: config_page_module_css_default.field,
								children: [
									(0, react_jsx_runtime.jsx)("span", {
										className: config_page_module_css_default.fieldLabel,
										children: t("maxChars")
									}),
									(0, react_jsx_runtime.jsx)("input", {
										className: charsInvalid ? config_page_module_css_default.inputInvalid : config_page_module_css_default.input,
										type: "text",
										inputMode: "numeric",
										value: draft.maxChars,
										disabled,
										"aria-invalid": charsInvalid,
										"aria-describedby": `${fieldId}-chars-message`,
										onChange: (event) => {
											edit("maxChars", event.target.value);
										}
									}),
									(0, react_jsx_runtime.jsx)("span", {
										id: `${fieldId}-chars-message`,
										className: charsInvalid ? config_page_module_css_default.invalidText : config_page_module_css_default.hint,
										children: charsInvalid ? t("invalidChars") : t("maxCharsHint")
									})
								]
							}), (0, react_jsx_runtime.jsxs)("label", {
								className: config_page_module_css_default.field,
								children: [
									(0, react_jsx_runtime.jsx)("span", {
										className: config_page_module_css_default.fieldLabel,
										children: t("maxTokens")
									}),
									(0, react_jsx_runtime.jsx)("input", {
										className: tokensInvalid ? config_page_module_css_default.inputInvalid : config_page_module_css_default.input,
										type: "text",
										inputMode: "numeric",
										value: draft.maxTokens,
										disabled,
										"aria-invalid": tokensInvalid,
										"aria-describedby": `${fieldId}-tokens-message`,
										onChange: (event) => {
											edit("maxTokens", event.target.value);
										}
									}),
									(0, react_jsx_runtime.jsx)("span", {
										id: `${fieldId}-tokens-message`,
										className: tokensInvalid ? config_page_module_css_default.invalidText : config_page_module_css_default.hint,
										children: tokensInvalid ? t("invalidTokens") : t("maxTokensHint")
									})
								]
							})]
						})]
					}),
					overrideInvalid && (0, react_jsx_runtime.jsx)("p", {
						className: config_page_module_css_default.alert,
						role: "alert",
						children: t("overrideRequired")
					}),
					selected !== null && catalogReady && !selectedInCatalog && (0, react_jsx_runtime.jsx)("p", {
						className: config_page_module_css_default.alert,
						role: "alert",
						children: t("missingRouteWarning")
					}),
					catalog.error !== null && (0, react_jsx_runtime.jsxs)("div", {
						className: config_page_module_css_default.alert,
						role: "alert",
						children: [(0, react_jsx_runtime.jsx)("span", { children: t("catalogWarning") }), (0, react_jsx_runtime.jsx)("button", {
							type: "button",
							className: config_page_module_css_default.retry,
							onClick: () => {
								refreshCatalog();
							},
							children: t("retry")
						})]
					}),
					fallback !== void 0 && (0, react_jsx_runtime.jsx)("p", {
						className: config_page_module_css_default.alert,
						role: "alert",
						children: t("fallbackWarning", {
							from: routeOf(fallback.from),
							to: routeOf(fallback.to),
							time: formatTime(fallback.at),
							reason: fallback.reason
						})
					}),
					!writable && (0, react_jsx_runtime.jsx)("p", {
						className: config_page_module_css_default.notice,
						role: "status",
						children: t("readOnly")
					}),
					(0, react_jsx_runtime.jsxs)("div", {
						className: config_page_module_css_default.actions,
						children: [
							(0, react_jsx_runtime.jsxs)("span", {
								className: config_page_module_css_default.saveState,
								role: "status",
								"aria-live": "polite",
								children: [
									saveState === "saved" ? t("saved") : null,
									saveState === "rejected" ? t("rejected") : null,
									saveState === "conflict" ? t("conflict") : null,
									saveState === "failed" ? t("saveFailed") : null
								]
							}),
							(0, react_jsx_runtime.jsx)("button", {
								type: "button",
								className: config_page_module_css_default.secondary,
								disabled: !dirty || saveState === "saving",
								onClick: discard,
								children: t("discard")
							}),
							(0, react_jsx_runtime.jsx)("button", {
								type: "submit",
								className: config_page_module_css_default.primary,
								disabled: !dirty || invalid || !writable || saveState === "saving",
								children: saveState === "saving" ? t("saving") : t("save")
							})
						]
					})
				]
			});
		}
		function RouteValue({ value }) {
			return (0, react_jsx_runtime.jsxs)("code", {
				className: config_page_module_css_default.route,
				children: [
					value.provider,
					"/",
					value.model
				]
			});
		}
		function sourceLabel(source, t) {
			switch (source) {
				case "session": return t("activeSourceSession");
				case "default": return t("activeSourceDefault");
				case "none": return t("activeSourceNone");
			}
		}
		function readDraft(snapshot) {
			const value = snapshot?.value;
			if (value === void 0) return void 0;
			const maxChars = typeof value.maxChars === "number" || typeof value.maxChars === "string" ? String(value.maxChars) : DEFAULT_DRAFT.maxChars;
			const maxTokens = typeof value.maxTokens === "number" || typeof value.maxTokens === "string" ? String(value.maxTokens) : DEFAULT_DRAFT.maxTokens;
			const override = value.modelOverride;
			if (isComplete(override)) return {
				maxChars,
				maxTokens,
				mode: "override",
				override
			};
			if (override === void 0 || override === null) return {
				maxChars,
				maxTokens,
				mode: "follow",
				override: null
			};
			return {
				maxChars,
				maxTokens,
				mode: "override",
				override: null
			};
		}
		function sameDraft(left, right) {
			return left.maxChars === right.maxChars && left.maxTokens === right.maxTokens && left.mode === right.mode && left.override?.provider === right.override?.provider && left.override?.model === right.override?.model;
		}
		function isComplete(value) {
			return typeof value === "object" && value !== null && typeof value.provider === "string" && value.provider !== "" && typeof value.model === "string" && value.model !== "";
		}
		function isIntegerInRange(text, minimum, maximum) {
			if (!/^\d+$/u.test(text.trim())) return false;
			const value = Number(text);
			return Number.isSafeInteger(value) && value >= minimum && value <= maximum;
		}
		function routeOf(value) {
			return `${value.provider}/${value.model}`;
		}
		function catalogContains(catalog, selection) {
			return catalog.groups.some((group) => group.id === selection.provider && group.models.some((model) => model.id === selection.model));
		}
		function groupCatalog(catalog, search, active, selected) {
			const query = search.trim().toLowerCase();
			const groups = [];
			let index = 0;
			for (const group of catalog?.groups ?? []) {
				const models = group.models.filter((model) => query === "" || model.name.toLowerCase().includes(query) || model.id.toLowerCase().includes(query) || group.name.toLowerCase().includes(query) || group.id.toLowerCase().includes(query));
				if (models.length === 0) continue;
				groups.push({
					id: group.id,
					name: group.name,
					options: models.map((model) => ({
						provider: group.id,
						providerName: group.name,
						model,
						index: index++,
						active: active?.provider === group.id && active.model === model.id,
						selected: selected?.provider === group.id && selected.model === model.id
					}))
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
			if (Number.isNaN(date.getTime())) return String(at);
			return date.toLocaleString();
		}
		//#endregion
		//#region lib/types/client/locales.js
		/** Locale dictionaries owned by the row configuration page. */
		/** Dictionary namespace registered with the DSH locale service. */
		const NS = "streamFocusSummary";
		/** English copy and the dictionary's key source. */
		const en = {
			summary: "Model-written progress phrases for running thinking rows.",
			summaryFollow: "Progress phrases follow the current Session model.",
			summaryOverride: "Progress phrases use {route}.",
			loading: "Loading configuration…",
			unavailable: "This configuration is unavailable.",
			readOnly: "This deployment stores settings read-only.",
			currentStatus: "Current status",
			activeSourceSession: "Current Session model",
			activeSourceDefault: "Deployment default model",
			activeSourceNone: "No model available",
			unboundSession: "No active Session; showing the deployment default model.",
			active: "Active",
			effective: "Effective",
			configured: "Configured",
			modelMode: "Summary model",
			limitsTitle: "Limits",
			followModel: "Follow the current Session model",
			followModelHint: "Uses the model selected for the active Session, or the deployment default when no Session is active.",
			overrideModel: "Use a specific model",
			overrideModelHint: "Every summary request uses this complete provider/model route.",
			chooseModel: "Choose model",
			changeModel: "Change model",
			clearModel: "Follow current Session model",
			modelPicker: "Summary model",
			searchModels: "Search models or providers",
			catalogLoading: "Loading models…",
			catalogRefreshing: "Refreshing models…",
			catalogFailed: "Could not load the model catalogue.",
			providerFailed: "Could not load models for {provider}: {message}",
			retry: "Retry",
			noModels: "No models match this search.",
			noCatalog: "The model catalogue is empty.",
			currentBadge: "Current Session",
			currentDefaultBadge: "Deployment default",
			selectedBadge: "Selected",
			maxChars: "Maximum characters",
			maxCharsHint: "Whole number from 10 to 80. Longer phrases are truncated by the Host.",
			maxTokens: "Maximum tokens",
			maxTokensHint: "Whole number from 256 to 4,000. Reasoning tokens share this budget.",
			invalidChars: "Enter a whole number from 10 to 80.",
			invalidTokens: "Enter a whole number from 256 to 4,000.",
			overrideRequired: "Choose a complete provider and model, or switch to following the current Session model.",
			save: "Save",
			saving: "Saving…",
			discard: "Discard",
			saved: "Configuration saved.",
			rejected: "The Host did not accept these values.",
			conflict: "Configuration changed while this page was open. Review the latest values and save again.",
			saveFailed: "Could not save the configuration.",
			missingRouteWarning: "The configured model is not in the current catalogue. The Host still attempts it; if the route is rejected, summaries fall back to the current Session model.",
			catalogWarning: "The model catalogue could not be loaded, so the configured model cannot be verified. Saving is still allowed.",
			fallbackWarning: "The last summary fell back from {from} to {to} at {time}: {reason}",
			noModelError: "No summary model is available. Summaries will not run until a Session or default model is configured.",
			statusUnavailable: "Model status is unavailable.",
			statusLoading: "Loading model status…",
			close: "Close"
		};
		/** Chinese copy, checked against the English keys. */
		const zh = {
			summary: "为运行中的思考行生成模型进度短语。",
			summaryFollow: "进度短语跟随当前会话模型。",
			summaryOverride: "进度短语使用 {route}。",
			loading: "正在加载配置…",
			unavailable: "摘要设置暂不可用。",
			readOnly: "本部署的设置为只读。",
			currentStatus: "当前状态",
			activeSourceSession: "当前会话模型",
			activeSourceDefault: "部署默认模型",
			activeSourceNone: "无可用模型",
			unboundSession: "没有活动会话，显示部署默认模型。",
			active: "生效中",
			effective: "实际使用",
			configured: "已配置",
			modelMode: "摘要模型",
			limitsTitle: "限制",
			followModel: "跟随当前会话模型",
			followModelHint: "使用活动会话选择的模型；没有活动会话时使用部署默认模型。",
			overrideModel: "指定模型",
			overrideModelHint: "每次摘要请求都使用这条完整的 provider/model 路由。",
			chooseModel: "选择模型",
			changeModel: "更换模型",
			clearModel: "跟随当前会话模型",
			modelPicker: "摘要模型",
			searchModels: "搜索模型或提供方",
			catalogLoading: "正在加载模型…",
			catalogRefreshing: "正在刷新模型…",
			catalogFailed: "无法加载模型目录。",
			providerFailed: "无法加载 {provider} 的模型：{message}",
			retry: "重试",
			noModels: "没有匹配的模型。",
			noCatalog: "模型目录为空。",
			currentBadge: "当前会话",
			currentDefaultBadge: "部署默认",
			selectedBadge: "已选择",
			maxChars: "最大字符数",
			maxCharsHint: "10 到 80 的整数；更长的短语会被 Host 截断。",
			maxTokens: "最大 token 数",
			maxTokensHint: "256 到 4,000 的整数；推理 token 也计入这份预算。",
			invalidChars: "请输入 10 到 80 的整数。",
			invalidTokens: "请输入 256 到 4,000 的整数。",
			overrideRequired: "请选择完整的 provider 和模型，或改为跟随当前会话模型。",
			save: "保存",
			saving: "保存中…",
			discard: "放弃修改",
			saved: "配置已保存。",
			rejected: "Host 没有接受这些值。",
			conflict: "页面打开期间配置已变化，请检查最新值后重新保存。",
			saveFailed: "无法保存配置。",
			missingRouteWarning: "已配置的模型不在当前目录中。Host 仍会尝试该路由；如果被拒绝，摘要会回退到当前会话模型。",
			catalogWarning: "无法加载模型目录，因此无法验证已配置的模型；仍可保存。",
			fallbackWarning: "最近一次摘要从 {from} 回退到 {to}（{time}）：{reason}",
			noModelError: "没有可用的摘要模型。在配置会话模型或默认模型之前，摘要不会运行。",
			statusUnavailable: "无法读取模型状态。",
			statusLoading: "正在读取模型状态…",
			close: "关闭"
		};
		//#endregion
		//#region lib/types/client/adapter.js
		/** Maximum paragraph text sent to the Host. */
		const PARAGRAPH_LIMIT = 4e3;
		/** Maximum whole-stretch text sent to the Host. */
		const SEGMENT_LIMIT = 8e3;
		const BLOCK_TAGS = /* @__PURE__ */ new Set([
			"ADDRESS",
			"ARTICLE",
			"ASIDE",
			"BLOCKQUOTE",
			"DIV",
			"DL",
			"DT",
			"DD",
			"FIELDSET",
			"FIGCAPTION",
			"FIGURE",
			"FOOTER",
			"FORM",
			"H1",
			"H2",
			"H3",
			"H4",
			"H5",
			"H6",
			"HEADER",
			"HR",
			"LI",
			"MAIN",
			"NAV",
			"OL",
			"P",
			"PRE",
			"SECTION",
			"TABLE",
			"TD",
			"TH",
			"TR",
			"UL"
		]);
		/** Find every product reasoning row in one document pass. */
		function thinkRows(doc) {
			return Array.from(doc.querySelectorAll("[data-variant=\"think\"]"));
		}
		/** The title is the disclosure label, never the collapsed preview or body copy. */
		function titleOf(root) {
			const candidates = root.querySelectorAll("[class]");
			for (const candidate of candidates) {
				if (candidate.closest("[class*=\"thinkBody\"]") !== null) continue;
				if (candidate.closest("[class*=\"summary\"]") !== null) continue;
				if ((candidate.getAttribute("class") ?? "").split(/\s+/).some((token) => /(?:^|_)title$/u.test(token))) return candidate;
			}
			const fallback = root.querySelector("[class*=\"_title\"]");
			if (fallback !== null && fallback.closest("[class*=\"thinkBody\"]") === null && fallback.closest("[class*=\"summary\"]") === null) return fallback;
		}
		/** Read the product's collapsed preview without confusing it with body text. */
		function previewOf(root) {
			const element = root.querySelector("[class*=\"summaryText\"]") ?? root.querySelector("[class*=\"summary\"]");
			return element === null ? "" : normalizeInline(element.textContent ?? "");
		}
		/** Read the expanded reasoning body, if the row still exposes it. */
		function bodyOf(root) {
			return root.querySelector("[class*=\"thinkBody\"]") ?? void 0;
		}
		/** Whether the product marks this row as the streaming tail. */
		function isRunning(root) {
			return root.getAttribute("data-state") === "running";
		}
		/**
		* Read one reasoning row. A row without a title has no product surface this
		* plugin can decorate and is reported as absent.
		* @param root - `[data-variant="think"]` root.
		* @returns current title, state, preview, body paragraphs, and stable anchor.
		*/
		function readThinkRow(root) {
			const title = titleOf(root);
			if (title === void 0) return void 0;
			const preview = previewOf(root);
			const body = bodyOf(root);
			const bodyText = body === void 0 ? "" : readBodyText(body);
			const paragraphs = paragraphsOf(bodyText === "" ? preview : bodyText);
			const running = isRunning(root);
			return {
				element: root,
				title,
				running,
				preview,
				bodyText,
				paragraphs,
				paragraphText: limitParagraph(latestCompletedParagraph(paragraphs, preview, running)),
				anchor: anchorOf(root)
			};
		}
		/**
		* Extract the latest completed paragraph. The product's collapsed preview
		* names that paragraph's first line, so a match wins over positional guesses;
		* without a preview the streaming tail is treated as incomplete.
		* @param paragraphs - normalized body paragraphs in display order.
		* @param preview - product collapsed preview, possibly empty when expanded.
		* @param running - whether the row is still streaming.
		* @returns the paragraph text, without a trailing newline.
		*/
		function latestCompletedParagraph(paragraphs, preview, running) {
			const line = normalizeInline(preview);
			if (line !== "") return paragraphs.find((paragraph) => firstLine(paragraph) === line) ?? line;
			if (!running) return paragraphs.at(-1) ?? "";
			return paragraphs.length > 1 ? paragraphs[paragraphs.length - 2] ?? "" : "";
		}
		/**
		* Split body text on one or more blank lines.
		* @param text - normalized reasoning text.
		* @returns non-empty normalized paragraphs.
		*/
		function paragraphsOf(text) {
			return text.split(/\n[ \t]*\n+/u).map((paragraph) => normalizeParagraph(paragraph)).filter((paragraph) => paragraph !== "");
		}
		/**
		* Extract text from the rendered Markdown body. `innerText` preserves the
		* browser's visual line breaks; the fallback serializer inserts paragraph
		* breaks between block elements, which `textContent` alone would lose.
		* @param body - product reasoning body element.
		* @returns normalized body text.
		*/
		function readBodyText(body) {
			const inner = body.innerText;
			if (typeof inner === "string" && inner.trim() !== "") return normalizeText(inner);
			const parts = [];
			for (let child = body.firstChild; child !== null; child = child.nextSibling) appendText(child, parts);
			return normalizeText(parts.join(""));
		}
		/**
		* Read the stable row identity the Host uses for locale-neutral anchors.
		* Missing product identity yields undefined; the plugin never fabricates it.
		* @param root - reasoning row root.
		* @returns node key, optional group part, and reasoning-row index.
		*/
		function anchorOf(root) {
			const owner = root.closest("[data-chat-node-key]") ?? root.closest("[data-chat-anchor-key]");
			if (owner === null) return void 0;
			const nodeKey = (owner.getAttribute("data-chat-node-key") ?? owner.getAttribute("data-chat-anchor-key") ?? "").trim();
			if (nodeKey === "") return void 0;
			const rowIndex = Array.from(owner.querySelectorAll("[data-variant=\"think\"]")).indexOf(root);
			if (rowIndex < 0) return void 0;
			const groupPart = owner.getAttribute("data-chat-group-part")?.trim();
			return {
				nodeKey,
				...groupPart === void 0 || groupPart === "" ? {} : { groupPart },
				rowIndex
			};
		}
		/** Truncate paragraph input to the Host's cap. */
		function limitParagraph(text) {
			return text.length > 4e3 ? text.slice(0, PARAGRAPH_LIMIT) : text;
		}
		/** Truncate segment input to the Host's cap. */
		function limitSegment(text) {
			return text.length > 8e3 ? text.slice(0, SEGMENT_LIMIT) : text;
		}
		/** Normalize one inline phrase or preview line. */
		function normalizeInline(text) {
			return text.replaceAll("**", "").replace(/\s+/gu, " ").trim();
		}
		function firstLine(text) {
			const newline = text.indexOf("\n");
			return normalizeInline(newline < 0 ? text : text.slice(0, newline));
		}
		function normalizeParagraph(text) {
			return text.replace(/\r\n?/gu, "\n").replace(/[ \t]{2,}/gu, " ").replace(/[ \t]+\n/gu, "\n").trim();
		}
		function normalizeText(text) {
			return text.replace(/\r\n?/gu, "\n").replace(/[ \t]+\n/gu, "\n").replace(/[ \t]{2,}/gu, " ").replace(/\n{3,}/gu, "\n\n").trim();
		}
		function appendText(node, out) {
			if (node.nodeType === 3) {
				out.push(node.nodeValue ?? "");
				return;
			}
			if (node.nodeType !== 1) return;
			const element = node;
			if (element.tagName === "SCRIPT" || element.tagName === "STYLE") return;
			if (element.tagName === "BR") {
				out.push("\n");
				return;
			}
			const block = BLOCK_TAGS.has(element.tagName);
			if (block && out.length > 0) out.push("\n\n");
			for (let child = element.firstChild; child !== null; child = child.nextSibling) appendText(child, out);
			if (block) out.push("\n\n");
		}
		//#endregion
		//#region lib/types/client/painter.js
		/** Paint and remove the plugin's attributes without touching product nodes. */
		const PROGRESS_ATTRIBUTE = "data-dshsf-progress";
		const PHRASE_ATTRIBUTE = "data-dshsf-phrase";
		const PENDING_ATTRIBUTE = "data-dshsf-pending";
		/**
		* Decorate a row with one phrase.
		* @param root - product reasoning row.
		* @param phrase - Host-generated phrase.
		* @returns false when the product title disappeared before painting.
		*/
		function paintPhrase(root, phrase) {
			const title = titleOf(root);
			if (title === void 0) return false;
			removePhraseAttributes(root, title);
			root.setAttribute(PROGRESS_ATTRIBUTE, "");
			root.removeAttribute(PENDING_ATTRIBUTE);
			title.setAttribute(PHRASE_ATTRIBUTE, phrase);
			return true;
		}
		/**
		* Show the neutral placeholder while a row has no phrase yet.
		* @param root - product reasoning row.
		* @returns false when the product title disappeared before painting.
		*/
		function paintPending(root) {
			const title = titleOf(root);
			if (title === void 0) return false;
			removePhraseAttributes(root, title);
			root.setAttribute(PROGRESS_ATTRIBUTE, "");
			root.setAttribute(PENDING_ATTRIBUTE, "");
			return true;
		}
		/**
		* Remove every attribute this plugin may have written to one row.
		* @param root - product reasoning row, connected or previously painted.
		*/
		function clearRow(root) {
			root.removeAttribute(PROGRESS_ATTRIBUTE);
			root.removeAttribute(PENDING_ATTRIBUTE);
			removeAllPhraseAttributes(root);
			if (root.hasAttribute(PHRASE_ATTRIBUTE)) root.removeAttribute(PHRASE_ATTRIBUTE);
		}
		function removePhraseAttributes(root, title) {
			const phrases = root.querySelectorAll(`[${PHRASE_ATTRIBUTE}]`);
			for (const element of phrases) if (element !== title) element.removeAttribute(PHRASE_ATTRIBUTE);
			if (title.hasAttribute(PHRASE_ATTRIBUTE)) title.removeAttribute(PHRASE_ATTRIBUTE);
		}
		function removeAllPhraseAttributes(root) {
			const phrases = root.querySelectorAll(`[${PHRASE_ATTRIBUTE}]`);
			for (const element of phrases) element.removeAttribute(PHRASE_ATTRIBUTE);
		}
		//#endregion
		//#region lib/types/client/queue.js
		/**
		* Keeps at most two Host calls in flight, replaces the pending request for the
		* same row/mode, gives running rows priority, and spaces starts by a minimum
		* gap. The queue carries no phrases; it only schedules work.
		*/
		var SummaryQueue = class {
			options;
			pending = [];
			inFlight = /* @__PURE__ */ new Map();
			aborted = /* @__PURE__ */ new Set();
			maxConcurrent;
			minGapMs;
			now;
			timer = null;
			active = 0;
			lastStart = Number.NEGATIVE_INFINITY;
			nextToken = 1;
			stopped = false;
			/**
			* @param options - RPC runner, settlement callbacks, and scheduling limits.
			*/
			constructor(options) {
				this.options = options;
				this.maxConcurrent = options.maxConcurrent ?? 2;
				this.minGapMs = options.minGapMs ?? 500;
				this.now = options.now ?? Date.now;
			}
			/**
			* Enqueue the latest request for a row and mode. An older pending request for
			* the same pair is discarded; in-flight requests are left to settle and are
			* rejected by the presenter's token check.
			* @param job - request identity without its queue token.
			* @returns the token assigned to this request.
			*/
			enqueue(job) {
				const token = this.nextToken++;
				const next = {
					...job,
					token
				};
				const duplicate = this.pending.findIndex((candidate) => candidate.row === job.row && candidate.request.mode === job.request.mode);
				if (duplicate >= 0) this.pending.splice(duplicate, 1);
				this.pending.push(next);
				this.pump();
				return token;
			}
			/**
			* Cancel every pending and in-flight request belonging to one row.
			* @param row - row whose requests must stop.
			*/
			abortRow(row) {
				for (let index = this.pending.length - 1; index >= 0; index -= 1) if (this.pending[index]?.row === row) this.pending.splice(index, 1);
				for (const [token, entry] of this.inFlight) {
					if (entry.job.row !== row) continue;
					this.aborted.add(token);
					entry.controller.abort();
				}
			}
			/** Re-arm a queue after {@link clear}; the presenter owns start/stop reuse. */
			restart() {
				this.stopped = false;
				this.aborted.clear();
				this.lastStart = Number.NEGATIVE_INFINITY;
				this.timer = null;
			}
			/** Cancel all pending work, abort in-flight requests, and stop the queue. */
			clear() {
				this.stopped = true;
				this.pending.length = 0;
				if (this.timer !== null) clearTimeout(this.timer);
				this.timer = null;
				for (const [token, entry] of this.inFlight) {
					this.aborted.add(token);
					entry.controller.abort();
				}
				this.inFlight.clear();
				this.active = 0;
			}
			pump() {
				if (this.stopped || this.pending.length === 0 || this.active >= this.maxConcurrent) return;
				const wait = this.minGapMs - (this.now() - this.lastStart);
				if (wait > 0) {
					this.arm(wait);
					return;
				}
				this.pending.sort((left, right) => priorityOf(left) - priorityOf(right) || left.token - right.token);
				const job = this.pending.shift();
				if (job === void 0) return;
				this.start(job);
				this.pump();
			}
			arm(wait) {
				if (this.timer !== null) return;
				this.timer = setTimeout(() => {
					this.timer = null;
					this.pump();
				}, wait);
			}
			start(job) {
				this.active += 1;
				this.lastStart = this.now();
				const controller = new AbortController();
				this.inFlight.set(job.token, {
					job,
					controller
				});
				Promise.resolve().then(() => this.options.run(job, controller.signal)).then((value) => {
					this.settle(job, () => this.options.onSuccess(job, value));
				}, (error) => {
					this.settle(job, () => this.options.onError(job, error));
				});
			}
			settle(job, callback) {
				this.inFlight.delete(job.token);
				this.active = Math.max(0, this.active - 1);
				if (!this.stopped && !this.aborted.delete(job.token)) try {
					callback();
				} catch (error) {
					console.error("[stream-focus-summary] request settlement failed:", error);
				}
				if (!this.stopped) this.pump();
			}
		};
		function priorityOf(job) {
			return job.priority === "active" ? 0 : 1;
		}
		//#endregion
		//#region lib/types/client/progress-style.js
		/** Global stylesheet owned by the row presenter. */
		const PROGRESS_STYLE = `
[data-variant="think"][data-dshsf-progress] [class*="separator"],
[data-variant="think"][data-dshsf-progress] [class*="summary"] {
  display: none !important;
}

[data-variant="think"][data-dshsf-progress] [data-disclosure-header] [data-shimmer] > [inert] {
  display: none !important;
}

[data-variant="think"][data-dshsf-progress] [class*="_title"]::after {
  content: " · " attr(data-dshsf-phrase);
  font-weight: 400;
  color: var(--dsw-alias-label-secondary, inherit);
  white-space: nowrap;
}

[data-variant="think"][data-dshsf-progress][data-dshsf-pending] [class*="_title"]::after {
  content: " · …";
  color: var(--dsw-alias-label-tertiary, inherit);
}
`;
		//#endregion
		//#region lib/types/client/presenter.js
		const SCAN_MS = 120;
		const VIEWPORT_MARGIN = 200;
		const HYDRATION_BATCH = 24;
		const STYLE_ID = "dsh-stream-focus-summary/progress";
		/**
		* Observes product reasoning rows and decorates them with Host phrases. The
		* presenter owns no reusable phrase cache: row state exists only while that
		* DOM row exists, and every fresh row restores its phrase through `phrases()`.
		*/
		var SummaryPresenter = class {
			options;
			queue;
			styleText;
			onWarning;
			now;
			rows = /* @__PURE__ */ new WeakMap();
			observer = null;
			viewportObserver = null;
			styleElement = null;
			scrollView = null;
			scanTimer = null;
			hydrationTimer = null;
			hydrationController = null;
			hydrationEntries = /* @__PURE__ */ new Map();
			hydrationId = 0;
			viewportPoll = null;
			dirtyRows = /* @__PURE__ */ new Set();
			scanAll = true;
			lastScanAt = Number.NEGATIVE_INFINITY;
			started = false;
			legacyWarned = false;
			domWarned = false;
			/**
			* @param options - document, Host calls, active identity reads, and diagnostics.
			*/
			constructor(options) {
				this.options = options;
				this.styleText = options.styleText ?? PROGRESS_STYLE;
				this.onWarning = options.onWarning ?? ((message) => {
					console.warn(message);
				});
				this.now = options.now ?? Date.now;
				this.queue = new SummaryQueue({
					run: (job, signal) => this.options.api.summarize(job.request, signal),
					onSuccess: (job, reply) => {
						this.accept(job, reply);
					},
					onError: (job, error) => {
						this.fail(job, error);
					},
					now: this.now
				});
			}
			/** Start observation, install the owned stylesheet, and scan current rows. */
			start() {
				if (this.started) return;
				this.started = true;
				this.queue.restart();
				this.scanAll = true;
				this.dirtyRows.clear();
				this.installStyle();
				this.attachViewportObserver();
				const body = this.options.document.body;
				if (body !== null && typeof MutationObserver !== "undefined") {
					this.observer = new MutationObserver((records) => {
						this.handleMutations(records);
					});
					this.observer.observe(body, {
						subtree: true,
						childList: true,
						characterData: true,
						attributes: true,
						attributeOldValue: true,
						attributeFilter: [
							"data-state",
							"data-dtp",
							"data-dshsf-progress",
							"data-dshsf-phrase",
							"data-dshsf-pending"
						]
					});
				}
				this.scan();
			}
			/** Disconnect every observer, cancel timers and requests, and remove decoration. */
			stop() {
				if (!this.started) return;
				this.started = false;
				this.observer?.disconnect();
				this.observer = null;
				this.viewportObserver?.disconnect();
				this.viewportObserver = null;
				if (this.viewportPoll !== null) clearInterval(this.viewportPoll);
				this.viewportPoll = null;
				if (this.scrollView !== null) {
					this.scrollView.removeEventListener("scroll", this.handleScroll, { capture: true });
					this.scrollView = null;
				}
				if (this.scanTimer !== null) clearTimeout(this.scanTimer);
				this.scanTimer = null;
				if (this.hydrationTimer !== null) clearTimeout(this.hydrationTimer);
				this.hydrationTimer = null;
				this.hydrationController?.abort();
				this.hydrationController = null;
				this.hydrationEntries.clear();
				this.queue.clear();
				this.dirtyRows.clear();
				this.scanAll = true;
				this.styleElement?.remove();
				this.styleElement = null;
				for (const root of thinkRows(this.options.document)) clearRow(root);
				this.rows = /* @__PURE__ */ new WeakMap();
			}
			installStyle() {
				const doc = this.options.document;
				if (doc.head === null || this.styleText === "") return;
				if (doc.head.querySelector(`style[data-plugin-css="${STYLE_ID}"]`) !== null) return;
				const style = doc.createElement("style");
				style.dataset.pluginCss = STYLE_ID;
				style.textContent = this.styleText;
				doc.head.appendChild(style);
				this.styleElement = style;
			}
			attachViewportObserver() {
				const view = this.options.document.defaultView;
				if (view === null) return;
				this.scrollView = view;
				view.addEventListener("scroll", this.handleScroll, {
					passive: true,
					capture: true
				});
				const Observer = view.IntersectionObserver;
				if (Observer === void 0) {
					this.viewportPoll = setInterval(() => {
						this.pollViewport();
					}, 1e3);
					return;
				}
				this.viewportObserver = new Observer((entries) => {
					let visible = false;
					for (const entry of entries) {
						const root = entry.target;
						const state = this.rows.get(root);
						if (state === void 0) continue;
						state.inViewport = entry.isIntersecting;
						if (entry.isIntersecting) visible = true;
					}
					if (visible) this.scheduleScan(true);
				});
			}
			handleScroll = () => {
				this.scanAll = true;
				this.scheduleScan();
			};
			scan() {
				if (!this.started) return;
				const targets = this.scanAll ? thinkRows(this.options.document) : [...this.dirtyRows];
				this.scanAll = false;
				this.dirtyRows.clear();
				this.lastScanAt = this.now();
				for (const root of targets) {
					if (!root.isConnected) continue;
					try {
						this.scanRow(root);
					} catch (error) {
						this.warn(`[stream-focus-summary] row scan failed: ${String(error)}`);
					}
				}
			}
			scanRow(root) {
				const existing = this.rows.get(root);
				if (root.hasAttribute("data-dtp")) {
					if (existing === void 0) {
						this.warnLegacyOnce();
						return;
					}
					if (!existing.legacy) this.blockLegacy(root, existing);
					return;
				}
				const snapshot = readThinkRow(root);
				if (snapshot === void 0) {
					this.warnDomOnce();
					return;
				}
				const state = existing ?? this.createState(snapshot);
				if (existing === void 0) this.rows.set(root, state);
				if (state.legacy) return;
				const phase = snapshot.running ? "running" : "settled";
				if (state.phase !== phase) this.transition(root, state, phase);
				if (snapshot.running && snapshot.bodyText !== "") state.capturedBody = limitSegment(snapshot.bodyText);
				this.repaint(root, state);
				if (!state.hydrated) {
					if (state.hydrating) return;
					if (state.hydrationRetryAt <= this.now() && this.queueHydration(root, state, snapshot)) return;
				}
				this.requestForRow(root, state, snapshot);
			}
			createState(snapshot) {
				const state = {
					phase: snapshot.running ? "running" : "settled",
					epoch: 0,
					rank: 0,
					phrase: "",
					paintedPhrase: "",
					paintedPending: false,
					paintedTitle: null,
					capturedBody: "",
					hydrated: false,
					hydrating: false,
					hydrationRetryAt: 0,
					paragraphAttempt: "",
					segmentAttempt: "",
					pendingModes: /* @__PURE__ */ new Set(),
					tokens: {
						paragraph: 0,
						segment: 0
					},
					inViewport: this.isNearViewport(snapshot.element),
					observed: false,
					legacy: false
				};
				if (!snapshot.running && !state.inViewport) this.observeViewport(snapshot.element, state);
				return state;
			}
			transition(root, state, phase) {
				state.phase = phase;
				state.epoch += 1;
				this.queue.abortRow(root);
				state.pendingModes.clear();
				state.tokens.paragraph = 0;
				state.tokens.segment = 0;
				if (phase === "running") {
					state.rank = state.phrase === "" ? 0 : 1;
					state.segmentAttempt = "";
				} else if (state.rank < 2) state.segmentAttempt = "";
			}
			repaint(root, state) {
				const title = titleOf(root);
				const pending = state.phrase === "" && state.pendingModes.size > 0;
				const phraseAttribute = state.phrase === "" ? null : title?.getAttribute("data-dshsf-phrase");
				if (title !== void 0 && title === state.paintedTitle && state.paintedPhrase === state.phrase && state.paintedPending === pending && (state.phrase === "" || phraseAttribute === state.phrase)) return;
				if (state.phrase !== "") {
					if (paintPhrase(root, state.phrase)) {
						state.paintedPhrase = state.phrase;
						state.paintedPending = false;
						state.paintedTitle = titleOf(root) ?? null;
					}
					return;
				}
				if (pending) {
					if (paintPending(root)) {
						state.paintedPhrase = "";
						state.paintedPending = true;
						state.paintedTitle = titleOf(root) ?? null;
					}
					return;
				}
				clearRow(root);
				state.paintedPhrase = "";
				state.paintedPending = false;
				state.paintedTitle = title ?? null;
			}
			requestForRow(root, state, snapshot) {
				if (snapshot.running) {
					const text = snapshot.paragraphText;
					if (text === "" || state.paragraphAttempt === text) return;
					state.paragraphAttempt = text;
					this.enqueue(root, state, snapshot, "paragraph", text, "active");
					return;
				}
				const segment = state.capturedBody !== "" ? state.capturedBody : snapshot.bodyText;
				if (segment === "") {
					if (!state.observed) this.observeViewport(root, state);
					return;
				}
				if (state.rank >= 2 && state.phrase !== "") return;
				state.inViewport = this.isNearViewport(root);
				if (!state.inViewport) {
					this.observeViewport(root, state);
					return;
				}
				const text = limitSegment(segment);
				if (text === "" || state.segmentAttempt === text) return;
				state.segmentAttempt = text;
				this.enqueue(root, state, snapshot, "segment", text, "historical");
			}
			enqueue(root, state, snapshot, mode, text, priority) {
				const sessionId = this.options.activeSessionId();
				const request = {
					text,
					mode,
					locale: this.currentLocale(),
					...sessionId === void 0 ? {} : { sessionId },
					...snapshot.anchor === void 0 ? {} : { anchor: snapshot.anchor }
				};
				state.tokens[mode] = this.queue.enqueue({
					row: root,
					epoch: state.epoch,
					priority,
					request
				});
				state.pendingModes.add(mode);
				if (state.phrase === "") this.repaint(root, state);
			}
			accept(job, reply) {
				if (!this.started || !job.row.isConnected) return;
				const state = this.rows.get(job.row);
				if (state === void 0 || state.legacy || state.epoch !== job.epoch) return;
				const mode = job.request.mode;
				if (state.tokens[mode] !== job.token) return;
				if (reply.phrase.trim() === "") {
					this.fail(job, /* @__PURE__ */ new Error("empty summary reply"));
					return;
				}
				if (mode === "paragraph") {
					if (state.phase !== "running" || state.rank >= 2) return;
					state.rank = state.rank >= 1 ? state.rank : 1;
					state.segmentAttempt = "";
				} else {
					if (state.phase !== "settled") return;
					state.rank = 2;
				}
				state.phrase = reply.phrase;
				state.pendingModes.delete(mode);
				paintPhrase(job.row, reply.phrase);
			}
			fail(job, error) {
				if (!this.started || !job.row.isConnected) return;
				const state = this.rows.get(job.row);
				if (state === void 0 || state.legacy || state.epoch !== job.epoch) return;
				if (state.tokens[job.request.mode] !== job.token) return;
				state.pendingModes.delete(job.request.mode);
				if (state.phrase !== "") {
					paintPhrase(job.row, state.phrase);
					return;
				}
				if (state.pendingModes.size === 0) {
					clearRow(job.row);
					if (error instanceof Error && error.name !== "AbortError") this.warn(`[stream-focus-summary] summary request failed: ${error.message}`);
				}
			}
			queueHydration(root, state, snapshot) {
				const queries = this.queriesFor(snapshot, state);
				if (queries.length === 0) return false;
				state.hydrating = true;
				const epoch = state.epoch;
				for (const query of queries) this.hydrationEntries.set(Number(query.id), {
					root,
					query,
					state,
					epoch
				});
				this.scheduleHydration();
				return true;
			}
			queriesFor(snapshot, state) {
				const locale = this.currentLocale();
				const sessionId = this.options.activeSessionId();
				const shared = {
					locale,
					...sessionId === void 0 ? {} : { sessionId },
					...snapshot.anchor === void 0 ? {} : { anchor: snapshot.anchor }
				};
				const queries = [];
				if (snapshot.running) {
					if (snapshot.paragraphText === "") return queries;
					queries.push({
						...shared,
						id: String(++this.hydrationId),
						text: snapshot.paragraphText,
						mode: "paragraph"
					});
					return queries;
				}
				const text = snapshot.bodyText !== "" ? snapshot.bodyText : state.capturedBody !== "" ? state.capturedBody : snapshot.preview;
				if (text === "") return queries;
				queries.push({
					...shared,
					id: String(++this.hydrationId),
					text: limitSegment(text),
					mode: "segment"
				});
				return queries;
			}
			scheduleHydration() {
				if (this.hydrationTimer !== null || this.hydrationEntries.size === 0) return;
				this.hydrationTimer = setTimeout(() => {
					this.hydrationTimer = null;
					this.flushHydration();
				}, 0);
			}
			flushHydration() {
				if (!this.started || this.hydrationEntries.size === 0) return;
				const entries = [...this.hydrationEntries.entries()].slice(0, HYDRATION_BATCH).map(([, entry]) => entry);
				for (const entry of entries) this.hydrationEntries.delete(Number(entry.query.id));
				const controller = new AbortController();
				this.hydrationController = controller;
				const queries = entries.map((entry) => entry.query);
				let succeeded = false;
				this.options.api.phrases(queries, controller.signal).then((hits) => {
					this.applyHydration(entries, hits);
					succeeded = true;
				}).catch((error) => {
					if (!controller.signal.aborted) this.warn(`[stream-focus-summary] phrase hydration failed: ${String(error)}`);
				}).finally(() => {
					if (this.hydrationController === controller) this.hydrationController = null;
					if (!this.started) return;
					for (const entry of entries) {
						entry.state.hydrating = false;
						if (succeeded) entry.state.hydrated = true;
						else entry.state.hydrationRetryAt = this.now() + 5e3;
					}
					this.scanAll = true;
					if (this.hydrationEntries.size > 0) this.scheduleHydration();
					this.scheduleScan();
				});
			}
			applyHydration(entries, hits) {
				if (!this.started) return;
				const index = new Map(hits.map((hit) => [hit.id, hit]));
				for (const entry of entries) {
					if (entry.state.epoch !== entry.epoch || entry.state.legacy) continue;
					const hit = index.get(entry.query.id);
					if (hit === void 0 || hit.phrase.trim() === "") continue;
					const rank = entry.query.mode === "segment" ? 2 : 1;
					if (entry.state.phrase !== "" && rank <= entry.state.rank) continue;
					entry.state.phrase = hit.phrase;
					entry.state.rank = rank;
					entry.state.pendingModes.delete(entry.query.mode);
					if (entry.query.mode === "segment") entry.state.segmentAttempt = entry.query.text;
					else entry.state.paragraphAttempt = entry.query.text;
					if (entry.root.isConnected) this.repaint(entry.root, entry.state);
				}
			}
			handleMutations(records) {
				if (!this.started) return;
				let immediate = false;
				let coalesced = false;
				for (const record of records) {
					const target = record.target;
					const element = target.nodeType === 1 ? target : target.parentElement;
					const row = element === null ? null : element.closest("[data-variant=\"think\"]");
					if (record.type === "attributes") {
						if (record.attributeName === "data-dtp") {
							if (row !== null) this.handleLegacyAttribute(row);
							continue;
						}
						if (record.attributeName === "data-state") {
							if (row !== null) this.dirtyRows.add(row);
							immediate = true;
							continue;
						}
						if (record.attributeName?.startsWith("data-dshsf-") === true) {
							if (record.oldValue !== null && row !== null && !row.hasAttribute(record.attributeName)) {
								this.dirtyRows.add(row);
								coalesced = true;
							}
							continue;
						}
						continue;
					}
					if (row !== null) {
						this.dirtyRows.add(row);
						coalesced = true;
						continue;
					}
					if (record.type === "childList") for (const node of record.addedNodes) {
						if (!containsThinkRow(node)) continue;
						if (node.nodeType === 1 && node.matches("[data-variant=\"think\"]")) this.dirtyRows.add(node);
						else if (node.nodeType === 1) for (const child of node.querySelectorAll("[data-variant=\"think\"]")) this.dirtyRows.add(child);
						coalesced = true;
					}
				}
				if (immediate) this.scanNow();
				else if (coalesced) this.scheduleScan();
			}
			handleLegacyAttribute(root) {
				const state = this.rows.get(root);
				if (state === void 0 || state.legacy) return;
				this.blockLegacy(root, state);
			}
			blockLegacy(root, state) {
				this.warnLegacyOnce();
				state.legacy = true;
				state.phrase = "";
				state.paintedPhrase = "";
				state.paintedPending = false;
				state.paintedTitle = null;
				state.pendingModes.clear();
				state.tokens.paragraph = 0;
				state.tokens.segment = 0;
				this.queue.abortRow(root);
				clearRow(root);
			}
			scheduleScan(immediate = false) {
				if (!this.started) return;
				if (immediate) {
					this.scanNow();
					return;
				}
				if (this.scanTimer !== null) return;
				const wait = SCAN_MS - (this.now() - this.lastScanAt);
				if (wait <= 0) {
					this.scanNow();
					return;
				}
				this.scanTimer = setTimeout(() => {
					this.scanTimer = null;
					this.scan();
				}, wait);
			}
			scanNow() {
				if (!this.started) return;
				if (this.scanTimer !== null) clearTimeout(this.scanTimer);
				this.scanTimer = null;
				this.scan();
			}
			pollViewport() {
				if (!this.started) return;
				let wake = false;
				for (const root of thinkRows(this.options.document)) {
					const state = this.rows.get(root);
					if (state === void 0 || state.legacy || state.phase !== "settled" || state.phrase !== "") continue;
					state.inViewport = this.isNearViewport(root);
					if (!state.inViewport) {
						this.observeViewport(root, state);
						continue;
					}
					state.observed = false;
					wake = true;
				}
				if (wake) this.scheduleScan(true);
			}
			isNearViewport(root) {
				const view = this.options.document.defaultView;
				if (view === null) return true;
				const rect = root.getBoundingClientRect();
				return rect.bottom >= -200 && rect.top <= view.innerHeight + VIEWPORT_MARGIN;
			}
			observeViewport(root, state) {
				if (state.observed) return;
				state.observed = true;
				this.viewportObserver?.observe(root);
			}
			currentLocale() {
				const active = this.options.activeLocale().trim();
				if (active !== "") return active;
				const declared = this.options.document.documentElement.lang.trim();
				return declared !== "" ? declared : "zh-CN";
			}
			warnLegacyOnce() {
				if (this.legacyWarned) return;
				this.legacyWarned = true;
				this.warn("[stream-focus-summary] detected the legacy thinking-progress plugin (data-dtp); leaving its rows untouched. Remove the old plugin to use summary phrases.");
			}
			warnDomOnce() {
				if (this.domWarned) return;
				this.domWarned = true;
				this.warn("[stream-focus-summary] could not find a reasoning row title; decoration is paused for product-markup changes.");
			}
			warn(message) {
				this.onWarning(message);
			}
		};
		function containsThinkRow(node) {
			if (node.nodeType !== 1) return false;
			const element = node;
			return element.matches("[data-variant=\"think\"]") || element.querySelector("[data-variant=\"think\"]") !== null;
		}
		//#endregion
		//#region lib/types/shared/protocol.js
		/** Wire contract shared by the summary Host service and browser runtime. */
		/** Typert/gateway service namespace and raw RPC endpoint prefix. */
		const SUMMARY_NAMESPACE = "streamFocusSummary";
		//#endregion
		//#region lib/types/client/rpc.js
		/** One failed call to the summary service, preserving the Host's error code. */
		var SummaryRpcError = class extends Error {
			code;
			/**
			* @param code - stable Host error code.
			* @param message - Host error message.
			*/
			constructor(code, message) {
				super(`${code}: ${message}`);
				this.code = code;
				this.name = "SummaryRpcError";
			}
		};
		/** Calls the summary service methods the browser owns. */
		var SummaryRpc = class {
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
				return this.call("summarize", { request }, signal);
			}
			/**
			* Hydrate already-known phrases for mounted rows.
			* @param queries - descriptors carrying client-only correlation ids.
			* @param signal - caller lifetime; aborting terminates the query.
			* @returns hits in the Host's response order.
			*/
			phrases(queries, signal) {
				return this.call("phrases", { queries }, signal);
			}
			/**
			* Read model diagnostics for the configuration page.
			* @param sessionId - active Session, or undefined for the deployment-default view.
			* @returns the Host's current model status.
			*/
			modelStatus(sessionId) {
				return this.call("modelStatus", sessionId === void 0 ? {} : { sessionId }, void 0);
			}
			async call(method, args, signal) {
				const result = await this.rpc.call("/api", `${SUMMARY_NAMESPACE}/${method}`, { args }, signal);
				if (!result.ok) throw new SummaryRpcError(result.error.code, result.error.message);
				return result.value;
			}
		};
		//#endregion
		//#region lib/types/client/session.js
		/** Resolve the one Session whose main view currently owns the transcript. */
		/**
		* Recognize the Client Sessions face without importing a UI feature that
		* declares `mainView`; the plugin reads only the catalog snapshot.
		* @param value - candidate service.
		* @returns whether it exposes an observable list snapshot.
		*/
		function isSessionsFace(value) {
			if (typeof value !== "object" || value === null) return false;
			const list = value.list;
			return typeof list === "object" && list !== null && typeof list.getSnapshot === "function" && typeof list.subscribe === "function";
		}
		/**
		* Tracks whether exactly one listed Session is retained by the main view.
		* Multiple retained Sessions are ambiguous and resolve to no identity, so the
		* Host keeps using its default model instead of guessing.
		*/
		var ActiveSessionResolver = class {
			sessions;
			listeners = /* @__PURE__ */ new Set();
			unsubscribe;
			/**
			* @param sessions - client Sessions service exposing the catalog snapshot.
			*/
			constructor(sessions) {
				this.sessions = sessions;
				this.unsubscribe = sessions.list.subscribe(() => {
					this.publish();
				});
			}
			/**
			* Read the current unambiguous Session identity.
			* @returns the one main-view retained Session, or undefined when none or several qualify.
			*/
			current() {
				const state = this.sessions.list.getSnapshot();
				let resolved;
				for (const id of state.ids) {
					const row = state.byId[id];
					if (row === void 0 || (row.retainedBy.mainView ?? 0) <= 0) continue;
					if (resolved !== void 0) return void 0;
					resolved = id;
				}
				return resolved;
			}
			/**
			* Observe Session-list replacement so the page can refresh its model status.
			* @param listener - invoked after the list snapshot changes.
			* @returns the unsubscribe function.
			*/
			subscribe(listener) {
				this.listeners.add(listener);
				return () => {
					this.listeners.delete(listener);
				};
			}
			/** Release the Session-list subscription owned by the plugin fiber. */
			dispose() {
				this.unsubscribe();
				this.listeners.clear();
			}
			publish() {
				for (const listener of [...this.listeners]) try {
					listener();
				} catch (error) {
					console.error("[stream-focus-summary] active Session listener failed:", error);
				}
			}
		};
		/** Empty fallback used only if the injected service fails its runtime shape check. */
		const EMPTY_SESSIONS = Object.freeze({ list: Object.freeze({
			getSnapshot: () => ({
				ids: [],
				byId: {}
			}),
			subscribe: () => () => {}
		}) });
		//#endregion
		//#region lib/types/client/index.js
		/** Services needed by phrase generation, active Session reads, and the row page. */
		const inject = [
			"connection",
			"sessions",
			"locale",
			"slots",
			"remote",
			"remote.session"
		];
		/**
		* Mount the summary presenter and register the row's configuration page.
		* The presenter and every subscription are owned by the plugin fiber and are
		* removed by `ctx.effect` cleanup.
		* @param ctx - browser plugin context.
		*/
		function apply(ctx) {
			ctx.effect(() => {
				const disposeEn = ctx.locale.register(NS, "en", en);
				const disposeZh = ctx.locale.register(NS, "zh", zh);
				return () => {
					disposeEn();
					disposeZh();
				};
			}, "stream-focus-summary: dictionaries");
			const sessionsService = ctx.get("sessions");
			const resolver = new ActiveSessionResolver(isSessionsFace(sessionsService) ? sessionsService : EMPTY_SESSIONS);
			ctx.effect(() => () => {
				resolver.dispose();
			}, "stream-focus-summary: active Session");
			const api = new SummaryRpc(ctx.get("connection").rpc);
			if (typeof document !== "undefined") {
				const presenter = new SummaryPresenter({
					document,
					api,
					activeLocale: () => ctx.locale.getSnapshot().active,
					activeSessionId: () => resolver.current()
				});
				ctx.effect(() => {
					try {
						presenter.start();
					} catch (error) {
						presenter.stop();
						console.warn("[stream-focus-summary] presenter disabled after error:", error);
					}
					return () => {
						presenter.stop();
					};
				}, "stream-focus-summary: presenter");
			}
			const refreshListeners = /* @__PURE__ */ new Set();
			ctx.effect(() => {
				const refresh = () => {
					for (const listener of [...refreshListeners]) try {
						listener();
					} catch (error) {
						console.error("[stream-focus-summary] model refresh listener failed:", error);
					}
				};
				return [
					ctx.remote.$on("llm/adapters-updated", refresh),
					ctx.remote.$on("llm/models-updated", refresh),
					ctx.remote.$on("settings/document-updated", refresh),
					ctx.remote.$on("credentials/record-updated", refresh),
					ctx.remote.$on("credentials/reference-updated", refresh),
					ctx.on("connection/reset", refresh)
				];
			}, "stream-focus-summary: model refresh events");
			const subscribeModelUpdates = (listener) => {
				refreshListeners.add(listener);
				return () => {
					refreshListeners.delete(listener);
				};
			};
			const subscribeLocale = (listener) => ctx.locale.subscribe(listener);
			const loadCatalog = async () => {
				const result = await ctx.remote.session.modelCatalog();
				if (!result.ok) throw new SummaryRpcError(result.error.code, result.error.message);
				return result.value;
			};
			const t = ctx.locale.bind(NS);
			ctx.slots.inject("plugins.row.config", () => ctx.slots.register({
				name: "plugins.row.config",
				key: "dsh-stream-focus#dsh-stream-focus-summary",
				inject: () => ({
					t,
					loadCatalog,
					loadStatus: (sessionId) => api.modelStatus(sessionId),
					activeSessionId: () => resolver.current(),
					subscribeActiveSession: (listener) => resolver.subscribe(listener),
					subscribeModelUpdates,
					subscribeLocale,
					resolveText: (text) => ctx.locale.resolveText(text)
				})
			}, SummaryConfigPage));
		}
		//#endregion
		exports.apply = apply;
		exports.inject = inject;
		return module.exports;
	}
});

//# sourceMappingURL=client.js.map