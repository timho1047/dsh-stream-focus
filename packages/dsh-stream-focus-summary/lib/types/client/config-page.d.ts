/** Row configuration page for summary limits and the Summary model route. */
import type { ModelCatalog } from '@deepseek-ai/dsh-api-remotes/client';
import type { PluginConfigViewProps } from '@deepseek-ai/dsh-client-ui-plugin-manager/client';
import { type ReactNode } from 'react';
import type { SummaryModelStatus } from '../shared/protocol.ts';
import type { SummaryLocaleKey } from './locales.ts';
type Translate = (key: SummaryLocaleKey, params?: Record<string, unknown>) => string;
interface LocalizedBadgeText {
    readonly en: string;
    readonly [locale: string]: string;
}
/** Data and callbacks supplied by the plugin's apply closure. */
export interface SummaryConfigPageInjected {
    readonly t: Translate;
    readonly loadCatalog: () => Promise<ModelCatalog>;
    readonly loadStatus: (sessionId: string | undefined) => Promise<SummaryModelStatus>;
    readonly activeSessionId: () => string | undefined;
    readonly subscribeActiveSession: (listener: () => void) => () => void;
    readonly subscribeModelUpdates: (listener: () => void) => () => void;
    readonly subscribeLocale: (listener: () => void) => () => void;
    readonly resolveText: (text: string | LocalizedBadgeText) => string;
}
/** Full prop face of the `plugins.row.config` entry. */
export type SummaryConfigPageProps = PluginConfigViewProps & SummaryConfigPageInjected;
/**
 * Render the row's one-line description or its full page. `summary` is also
 * the fallback when the plugin manager has no package description.
 * @param props - view, plugin-manager form, and apply-closure data.
 * @returns the requested row configuration view.
 */
export declare function SummaryConfigPage(props: SummaryConfigPageProps): ReactNode;
export {};
