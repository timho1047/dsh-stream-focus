import { memo, useEffect, useRef, useState } from 'react'
import type {
  HostObservable, InjectFace, PropsRenderFactories, PropsRuntime,
} from '@deepseek-ai/dsh-client-ui-slots'
// Type-only: the reasoning Body Slot contract and the Factory rendered through it.
import type {} from '@deepseek-ai/dsh-client-ui-chat/client'
import { nextRevealLength } from './pacing.ts'

/** Cap Markdown re-renders at 60fps even on 120Hz displays. */
const PAINT_INTERVAL_MS = 1000 / 60
/** Large histories make per-frame Markdown work visible; native streaming is smoother there. */
const MAX_FLOW_ROWS = 150
const MAX_PACED_CHARS = 4_000

/** The plugin's per-frame pacing preference supplied through the slot inject face. */
interface PacingInjected {
  hooks: {
    pacing: HostObservable<boolean>
  }
}

type PacedReasoningBodyProps = PropsRuntime<'conversation.chat.reasoning.body'>
  & PropsRenderFactories
  & InjectFace<PacingInjected>

/**
 * Pace the live reasoning text into the official Content Factory.
 *
 * The display text is the complete accumulated reasoning after DSH has
 * prepared it for display (including signature removal). Only the text handed
 * to the Markdown renderer is progressively revealed; when the block settles,
 * the full display text is rendered immediately. This keeps the official
 * Markdown pipeline, labels, and any replacement Content Factory intact.
 */
export const PacedReasoningBody = memo(function PacedReasoningBody({
  text, running, renderFactorySlot, usePacing,
}: PacedReasoningBodyProps) {
  const pacing = usePacing(value => value)
  const crowded = useRef<boolean | null>(null)
  if (crowded.current === null) {
    crowded.current = document.querySelectorAll('[data-chat-flow-kind]').length > MAX_FLOW_ROWS
  }
  const visible = usePacedText(text, running && pacing && !crowded.current && text.length <= MAX_PACED_CHARS)
  return renderFactorySlot('conversation.chat.reasoning.content', { text: visible, running })
})

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
function usePacedText(text: string, enabled: boolean): string {
  const [visible, setVisible] = useState(text.length)
  const visibleRef = useRef(text.length)
  const targetRef = useRef(text)
  const previousRef = useRef(text)
  const frameRef = useRef<number | null>(null)

  useEffect(() => {
    targetRef.current = text
    if (!text.startsWith(previousRef.current)) {
      previousRef.current = text
      visibleRef.current = text.length
      setVisible(text.length)
      return
    }
    previousRef.current = text
    if (!enabled) {
      if (visibleRef.current !== text.length) {
        visibleRef.current = text.length
        setVisible(text.length)
      }
      return
    }
    if (text.length <= visibleRef.current) return
    if (typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches) {
      visibleRef.current = text.length
      setVisible(text.length)
      return
    }

    if (frameRef.current !== null) cancelAnimationFrame(frameRef.current)
    let previousTime: number | null = null
    const tick = (time: number): void => {
      frameRef.current = null
      if (previousTime !== null && time - previousTime < PAINT_INTERVAL_MS - 1) {
        frameRef.current = requestAnimationFrame(tick)
        return
      }
      const target = targetRef.current
      const current = visibleRef.current
      if (current >= target.length) return
      const elapsed = previousTime === null ? PAINT_INTERVAL_MS : time - previousTime
      previousTime = time
      const next = nextRevealLength(current, target, elapsed)
      visibleRef.current = next
      setVisible(next)
      if (next < target.length) frameRef.current = requestAnimationFrame(tick)
    }
    frameRef.current = requestAnimationFrame(tick)
    return () => {
      if (frameRef.current !== null) {
        cancelAnimationFrame(frameRef.current)
        frameRef.current = null
      }
    }
  }, [text, enabled])

  return text.slice(0, Math.min(visible, text.length))
}
