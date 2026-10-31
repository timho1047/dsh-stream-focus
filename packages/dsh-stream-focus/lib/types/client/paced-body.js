import { memo, useEffect, useRef, useState } from 'react';
import { nextRevealLength } from "./pacing.js";
/**
 * Pace the live reasoning text into the official Content Factory.
 *
 * The source text remains the complete accumulated reasoning. Only the text
 * handed to the Markdown renderer is progressively revealed; when the block
 * settles, the full source is rendered immediately. This keeps the official
 * Markdown pipeline, labels, and any replacement Content Factory intact.
 */
export const PacedReasoningBody = memo(function PacedReasoningBody({ text, running, renderFactorySlot, usePacing, }) {
    const pacing = usePacing(value => value);
    const visible = usePacedText(text, running && pacing);
    return renderFactorySlot('conversation.chat.reasoning.content', { text: visible, running });
});
/**
 * Reveal appended reasoning over animation frames, not arrival chunks.
 *
 * Mounting shows the already-received text immediately; only subsequent
 * growth is paced, so expanding an older row never replays history. A
 * non-append replacement falls back to the complete text instead of animating
 * corrected content. Reduced-motion users always receive the full text.
 *
 * @param text - complete accumulated reasoning.
 * @param enabled - pace only while the block is streaming in Standard mode.
 * @returns the visible prefix handed to Markdown.
 */
function usePacedText(text, enabled) {
    const [visible, setVisible] = useState(text.length);
    const visibleRef = useRef(text.length);
    const targetRef = useRef(text);
    const previousRef = useRef(text);
    const frameRef = useRef(null);
    useEffect(() => {
        targetRef.current = text;
        if (!text.startsWith(previousRef.current)) {
            previousRef.current = text;
            visibleRef.current = text.length;
            setVisible(text.length);
            return;
        }
        previousRef.current = text;
        if (!enabled) {
            if (visibleRef.current !== text.length) {
                visibleRef.current = text.length;
                setVisible(text.length);
            }
            return;
        }
        if (text.length <= visibleRef.current)
            return;
        if (typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches) {
            visibleRef.current = text.length;
            setVisible(text.length);
            return;
        }
        if (frameRef.current !== null)
            cancelAnimationFrame(frameRef.current);
        let previousTime = null;
        const tick = (time) => {
            frameRef.current = null;
            const target = targetRef.current;
            const current = visibleRef.current;
            if (current >= target.length)
                return;
            const elapsed = previousTime === null ? 1000 / 60 : time - previousTime;
            previousTime = time;
            const next = nextRevealLength(current, target, elapsed);
            visibleRef.current = next;
            setVisible(next);
            if (next < target.length)
                frameRef.current = requestAnimationFrame(tick);
        };
        frameRef.current = requestAnimationFrame(tick);
        return () => {
            if (frameRef.current !== null) {
                cancelAnimationFrame(frameRef.current);
                frameRef.current = null;
            }
        };
    }, [text, enabled]);
    return text.slice(0, Math.min(visible, text.length));
}
//# sourceMappingURL=paced-body.js.map