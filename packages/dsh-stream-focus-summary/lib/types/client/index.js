import { SummaryConfigPage } from "./config-page.js";
import { en, NS, zh } from "./locales.js";
import { SummaryPresenter } from "./presenter.js";
import { SummaryRpc, SummaryRpcError } from "./rpc.js";
import { ActiveSessionResolver, EMPTY_SESSIONS, isSessionsFace } from "./session.js";
/** Services needed by phrase generation, active Session reads, and the row page. */
export const inject = ['connection', 'sessions', 'locale', 'slots', 'remote', 'remote.session'];
/**
 * Mount the summary presenter and register the row's configuration page.
 * The presenter and every subscription are owned by the plugin fiber and are
 * removed by `ctx.effect` cleanup.
 * @param ctx - browser plugin context.
 */
export function apply(ctx) {
    ctx.effect(() => {
        const disposeEn = ctx.locale.register(NS, 'en', en);
        const disposeZh = ctx.locale.register(NS, 'zh', zh);
        return () => {
            disposeEn();
            disposeZh();
        };
    }, 'stream-focus-summary: dictionaries');
    const sessionsService = ctx.get('sessions');
    const resolver = new ActiveSessionResolver(isSessionsFace(sessionsService) ? sessionsService : EMPTY_SESSIONS);
    ctx.effect(() => () => { resolver.dispose(); }, 'stream-focus-summary: active Session');
    const connection = ctx.get('connection');
    const api = new SummaryRpc(connection.rpc);
    if (typeof document !== 'undefined') {
        const presenter = new SummaryPresenter({
            document,
            api,
            activeLocale: () => ctx.locale.getSnapshot().active,
            activeSessionId: () => resolver.current(),
        });
        ctx.effect(() => {
            try {
                presenter.start();
            }
            catch (error) {
                presenter.stop();
                console.warn('[stream-focus-summary] presenter disabled after error:', error);
            }
            return () => { presenter.stop(); };
        }, 'stream-focus-summary: presenter');
    }
    const refreshListeners = new Set();
    ctx.effect(() => {
        const refresh = () => {
            for (const listener of [...refreshListeners]) {
                try {
                    listener();
                }
                catch (error) {
                    console.error('[stream-focus-summary] model refresh listener failed:', error);
                }
            }
        };
        return [
            ctx.remote.$on('llm/adapters-updated', refresh),
            ctx.remote.$on('llm/models-updated', refresh),
            ctx.remote.$on('settings/document-updated', refresh),
            ctx.remote.$on('credentials/record-updated', refresh),
            ctx.remote.$on('credentials/reference-updated', refresh),
            ctx.on('connection/reset', refresh),
        ];
    }, 'stream-focus-summary: model refresh events');
    const subscribeModelUpdates = (listener) => {
        refreshListeners.add(listener);
        return () => { refreshListeners.delete(listener); };
    };
    const subscribeLocale = (listener) => ctx.locale.subscribe(listener);
    const loadCatalog = async () => {
        const result = await ctx.remote.session.modelCatalog();
        if (!result.ok)
            throw new SummaryRpcError(result.error.code, result.error.message);
        return result.value;
    };
    const t = ctx.locale.bind(NS);
    ctx.slots.inject('plugins.row.config', () => ctx.slots.register({
        name: 'plugins.row.config',
        key: 'dsh-stream-focus#dsh-stream-focus-summary',
        inject: () => ({
            t,
            loadCatalog,
            loadStatus: (sessionId) => api.modelStatus(sessionId),
            activeSessionId: () => resolver.current(),
            subscribeActiveSession: (listener) => resolver.subscribe(listener),
            subscribeModelUpdates,
            subscribeLocale,
            resolveText: (text) => ctx.locale.resolveText(text),
        }),
    }, SummaryConfigPage));
}
//# sourceMappingURL=index.js.map