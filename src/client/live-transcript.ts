/** The DSH Chat DOM contract read by every runtime module. */

const GROUP = '[data-chat-group-key]'
const FLOW = '[data-chat-flow]'
const PROCESS_CONTENT = '[data-step-process-content]'
const PROCESS_BODY = '[data-step-process-body]'
const OUTER = '[data-conversation-scroll]'
const RUNNING = '[data-chat-running]'
const ASSISTANT = '[data-chat-flow-kind="assistant-step"]'
const RESPONSE = '[data-chat-group-part="response"]'
const STREAMING = '[data-streaming]'

/** The root flow that contains the running Turn. */
export function runningFlow(doc: Document = document): HTMLElement | null {
  const running = doc.querySelector<HTMLElement>(RUNNING)
  return running?.closest<HTMLElement>(`${FLOW}:not(${PROCESS_CONTENT})`)
    ?? running?.closest<HTMLElement>(FLOW)
    ?? null
}

/** All process groups in one flow, in document order. */
export function groupsIn(root: HTMLElement): HTMLElement[] {
  return [...root.querySelectorAll<HTMLElement>(GROUP)]
}

/** The newest process group in one flow. */
export function latestGroup(root: HTMLElement): HTMLElement | null {
  return groupsIn(root).at(-1) ?? null
}

/** The newest turn number represented in one flow. */
export function latestTurn(root: HTMLElement): number {
  let latest = Number.NEGATIVE_INFINITY
  for (const element of root.querySelectorAll<HTMLElement>('[data-chat-turn]')) {
    const turn = Number(element.getAttribute('data-chat-turn'))
    if (Number.isFinite(turn) && turn > latest) latest = turn
  }
  return Number.isFinite(latest) ? latest : -1
}

/** The visible clickable header of a group. */
export function groupHeader(group: HTMLElement): HTMLButtonElement | null {
  return group.querySelector<HTMLButtonElement>(':scope > div > button[aria-expanded]')
}

/** The process rows container inside a group. */
export function groupContent(group: HTMLElement): HTMLElement | null {
  return group.querySelector<HTMLElement>(PROCESS_CONTENT)
}

/** The scrollable body of a group. */
export function processBody(group: HTMLElement): HTMLElement | null {
  return group.querySelector<HTMLElement>(PROCESS_BODY)
}

/** The outer conversation scrollport. */
export function outerScroller(doc: Document = document): HTMLElement | null {
  return doc.querySelector<HTMLElement>(OUTER)
}

/** Whether the outer Chat currently follows the tail. */
export function followingTail(doc: Document = document): boolean {
  return doc.querySelector('[data-chat-following-tail]') !== null
}

/** Process rows in the latest turn of a flow. */
export function latestTurnRows(root: HTMLElement): HTMLElement[] {
  const turn = latestTurn(root)
  const slot = root.querySelector<HTMLElement>('[data-slot="conversation.chat.flow"]') ?? root
  return [...slot.querySelectorAll<HTMLElement>('[data-chat-flow-kind]')]
    .filter(row => Number(row.getAttribute('data-chat-turn')) === turn)
}

/** Streaming assistant prose roots. */
export function streamingAssistantRoots(doc: Document = document): HTMLElement[] {
  return [...doc.querySelectorAll<HTMLElement>(`${ASSISTANT}${RESPONSE} ${STREAMING}`)]
}
