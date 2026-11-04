import type { HostObservable, InjectFace, PropsRenderFactories, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots';
/** The plugin's per-frame pacing preference supplied through the slot inject face. */
interface PacingInjected {
    hooks: {
        pacing: HostObservable<boolean>;
    };
}
type PacedReasoningBodyProps = PropsRuntime<'conversation.chat.reasoning.body'> & PropsRenderFactories & InjectFace<PacingInjected>;
/**
 * Pace the live reasoning text into the official Content Factory.
 *
 * The display text is the complete accumulated reasoning after DSH has
 * prepared it for display (including signature removal). Only the text handed
 * to the Markdown renderer is progressively revealed; when the block settles,
 * the full display text is rendered immediately. This keeps the official
 * Markdown pipeline, labels, and any replacement Content Factory intact.
 */
export declare const PacedReasoningBody: import("react").NamedExoticComponent<PacedReasoningBodyProps>;
export {};
