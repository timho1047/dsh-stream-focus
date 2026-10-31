/** The DSH Chat DOM contract read by every runtime module. */
const GROUP = '[data-chat-group-key]';
const FLOW = '[data-chat-flow]';
const PROCESS_CONTENT = '[data-step-process-content]';
const PROCESS_BODY = '[data-step-process-body]';
const OUTER = '[data-conversation-scroll]';
const RUNNING = '[data-chat-running]';
const ASSISTANT = '[data-chat-flow-kind="assistant-step"]';
const RESPONSE = '[data-chat-group-part="response"]';
const STREAMING = '[data-streaming]';
/** The root flow that contains the running Turn. */
export function runningFlow(doc = document) {
    const running = doc.querySelector(RUNNING);
    return running?.closest(`${FLOW}:not(${PROCESS_CONTENT})`)
        ?? running?.closest(FLOW)
        ?? null;
}
/** All process groups in one flow, in document order. */
export function groupsIn(root) {
    return [...root.querySelectorAll(GROUP)];
}
/** The newest process group in one flow. */
export function latestGroup(root) {
    return groupsIn(root).at(-1) ?? null;
}
/** The newest turn number represented in one flow. */
export function latestTurn(root) {
    let latest = Number.NEGATIVE_INFINITY;
    for (const element of root.querySelectorAll('[data-chat-turn]')) {
        const turn = Number(element.getAttribute('data-chat-turn'));
        if (Number.isFinite(turn) && turn > latest)
            latest = turn;
    }
    return Number.isFinite(latest) ? latest : -1;
}
/** The visible clickable header of a group. */
export function groupHeader(group) {
    return group.querySelector(':scope > div > button[aria-expanded]');
}
/** The process rows container inside a group. */
export function groupContent(group) {
    return group.querySelector(PROCESS_CONTENT);
}
/** The scrollable body of a group. */
export function processBody(group) {
    return group.querySelector(PROCESS_BODY);
}
/** The outer conversation scrollport. */
export function outerScroller(doc = document) {
    return doc.querySelector(OUTER);
}
/** Whether the outer Chat currently follows the tail. */
export function followingTail(doc = document) {
    return doc.querySelector('[data-chat-following-tail]') !== null;
}
/** Process rows in the latest turn of a flow. */
export function latestTurnRows(root) {
    const turn = latestTurn(root);
    const slot = root.querySelector('[data-slot="conversation.chat.flow"]') ?? root;
    return [...slot.querySelectorAll('[data-chat-flow-kind]')]
        .filter(row => Number(row.getAttribute('data-chat-turn')) === turn);
}
/** Streaming assistant prose roots. */
export function streamingAssistantRoots(doc = document) {
    return [...doc.querySelectorAll(`${ASSISTANT}${RESPONSE} ${STREAMING}`)];
}
//# sourceMappingURL=live-transcript.js.map