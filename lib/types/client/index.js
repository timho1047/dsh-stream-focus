import { createSnapshotStore } from '@deepseek-ai/dsh-client-store';
import { StreamWindowConductor } from "./conductor.js";
import { PacedReasoningBody } from "./paced-body.js";
import { NormalOutputSmoother } from "./normal-smoothing.js";
import { FlatRowConductor } from "./flat-rows.js";
import { conductorFor, resolveMode } from "./mode-policy.js";
/** Required services: shared Settings forms and the Slot registry. */
export const inject = ['configForms', 'slots'];
/**
 * Mount the mode-appropriate row conductor, the paced reasoning renderer, and
 * the normal-output smoother. Settings not yet accepted start nothing.
 * @param ctx - Client root context.
 */
export function apply(ctx) {
    const pacing = createSnapshotStore(false);
    ctx.slots.inject('conversation.chat.reasoning.body', () => ctx.slots.register({
        name: 'conversation.chat.reasoning.body',
        priority: 10,
        inject: () => ({ hooks: { pacing } }),
    }, PacedReasoningBody));
    const form = ctx.configForms.get('ui-chat');
    let conductor = null;
    let flat = null;
    let smoother = null;
    const reconcile = () => {
        const mode = resolveConfiguredMode(form.getSnapshot());
        pacing.set(mode !== null);
        const grouped = mode !== null && conductorFor(mode) === 'grouped';
        const flatMode = mode === 'detailed' || mode === 'verbose';
        if (grouped && conductor === null) {
            conductor = new StreamWindowConductor();
            conductor.start();
        }
        else if (!grouped && conductor !== null) {
            conductor.stop();
            conductor = null;
        }
        if (flatMode && flat === null) {
            flat = new FlatRowConductor(mode);
            flat.start();
        }
        else if (!flatMode && flat !== null) {
            flat.stop();
            flat = null;
        }
        if (mode !== null && smoother === null) {
            smoother = new NormalOutputSmoother();
            smoother.start();
        }
        else if (mode === null && smoother !== null) {
            smoother.stop();
            smoother = null;
        }
    };
    ctx.effect(() => {
        const unsubscribe = form.subscribe(reconcile);
        reconcile();
        return () => {
            unsubscribe();
            conductor?.stop();
            conductor = null;
            smoother?.stop();
            smoother = null;
            flat?.stop();
            flat = null;
        };
    }, 'stream-focus: mode conductors');
}
/** Resolve the configured mode, or null while the settings snapshot is not ready. */
function resolveConfiguredMode(snapshot) {
    if (snapshot.status === 'loading')
        return null;
    return resolveMode(snapshot.value?.transcriptView, 'dshDesktop' in globalThis);
}
//# sourceMappingURL=index.js.map