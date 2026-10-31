/** Browser entry: row phrase runtime plus the plugin-manager row configuration. */
import type { Context as ClientContext } from '@deepseek-ai/cordis';
/** Services needed by phrase generation, active Session reads, and the row page. */
export declare const inject: readonly ["connection", "sessions", "locale", "slots", "remote", "remote.session"];
/**
 * Mount the summary presenter and register the row's configuration page.
 * The presenter and every subscription are owned by the plugin fiber and are
 * removed by `ctx.effect` cleanup.
 * @param ctx - browser plugin context.
 */
export declare function apply(ctx: ClientContext): void;
