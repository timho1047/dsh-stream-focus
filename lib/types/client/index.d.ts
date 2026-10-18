/** Browser half: drive the Standard-mode process window from the live Chat DOM. */
import type { Context as ClientContext } from '@deepseek-ai/cordis';
/** Required services: shared Settings forms and the Slot registry. */
export declare const inject: string[];
/**
 * Mount the mode-appropriate row conductor, the paced reasoning renderer, and
 * the normal-output smoother. Settings not yet accepted start nothing.
 * @param ctx - Client root context.
 */
export declare function apply(ctx: ClientContext): void;
