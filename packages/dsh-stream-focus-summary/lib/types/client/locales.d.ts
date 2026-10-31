/** Locale dictionaries owned by the row configuration page. */
/** Dictionary namespace registered with the DSH locale service. */
export declare const NS = "streamFocusSummary";
/** English copy and the dictionary's key source. */
export declare const en: {
    readonly summary: "Model-written progress phrases for running thinking rows.";
    readonly summaryFollow: "Progress phrases follow the current Session model.";
    readonly summaryOverride: "Progress phrases use {route}.";
    readonly loading: "Loading configuration…";
    readonly unavailable: "This configuration is unavailable.";
    readonly readOnly: "This deployment stores settings read-only.";
    readonly currentStatus: "Current status";
    readonly activeSourceSession: "Current Session model";
    readonly activeSourceDefault: "Deployment default model";
    readonly activeSourceNone: "No model available";
    readonly unboundSession: "No active Session; showing the deployment default model.";
    readonly active: "Active";
    readonly effective: "Effective";
    readonly configured: "Configured";
    readonly modelMode: "Summary model";
    readonly limitsTitle: "Limits";
    readonly followModel: "Follow the current Session model";
    readonly followModelHint: "Uses the model selected for the active Session, or the deployment default when no Session is active.";
    readonly overrideModel: "Use a specific model";
    readonly overrideModelHint: "Every summary request uses this complete provider/model route.";
    readonly chooseModel: "Choose model";
    readonly changeModel: "Change model";
    readonly clearModel: "Follow current Session model";
    readonly modelPicker: "Summary model";
    readonly searchModels: "Search models or providers";
    readonly catalogLoading: "Loading models…";
    readonly catalogRefreshing: "Refreshing models…";
    readonly catalogFailed: "Could not load the model catalogue.";
    readonly providerFailed: "Could not load models for {provider}: {message}";
    readonly retry: "Retry";
    readonly noModels: "No models match this search.";
    readonly noCatalog: "The model catalogue is empty.";
    readonly currentBadge: "Current Session";
    readonly currentDefaultBadge: "Deployment default";
    readonly selectedBadge: "Selected";
    readonly maxChars: "Maximum characters";
    readonly maxCharsHint: "Whole number from 10 to 80. Longer phrases are truncated by the Host.";
    readonly maxTokens: "Maximum tokens";
    readonly maxTokensHint: "Whole number from 256 to 4,000. Reasoning tokens share this budget.";
    readonly invalidChars: "Enter a whole number from 10 to 80.";
    readonly invalidTokens: "Enter a whole number from 256 to 4,000.";
    readonly overrideRequired: "Choose a complete provider and model, or switch to following the current Session model.";
    readonly save: "Save";
    readonly saving: "Saving…";
    readonly discard: "Discard";
    readonly saved: "Configuration saved.";
    readonly rejected: "The Host did not accept these values.";
    readonly conflict: "Configuration changed while this page was open. Review the latest values and save again.";
    readonly saveFailed: "Could not save the configuration.";
    readonly missingRouteWarning: "The configured model is not in the current catalogue. The Host still attempts it; if the route is rejected, summaries fall back to the current Session model.";
    readonly catalogWarning: "The model catalogue could not be loaded, so the configured model cannot be verified. Saving is still allowed.";
    readonly fallbackWarning: "The last summary fell back from {from} to {to} at {time}: {reason}";
    readonly noModelError: "No summary model is available. Summaries will not run until a Session or default model is configured.";
    readonly statusUnavailable: "Model status is unavailable.";
    readonly statusLoading: "Loading model status…";
    readonly close: "Close";
};
/** Locale dictionary key union. */
export type SummaryLocaleKey = keyof typeof en;
/** Chinese copy, checked against the English keys. */
export declare const zh: Record<SummaryLocaleKey, string>;
