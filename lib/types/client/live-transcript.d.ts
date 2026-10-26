/** The DSH Chat DOM contract read by every runtime module. */
/** The root flow that contains the running Turn. */
export declare function runningFlow(doc?: Document): HTMLElement | null;
/** All process groups in one flow, in document order. */
export declare function groupsIn(root: HTMLElement): HTMLElement[];
/** The newest process group in one flow. */
export declare function latestGroup(root: HTMLElement): HTMLElement | null;
/** The newest turn number represented in one flow. */
export declare function latestTurn(root: HTMLElement): number;
/** The visible clickable header of a group. */
export declare function groupHeader(group: HTMLElement): HTMLButtonElement | null;
/** The process rows container inside a group. */
export declare function groupContent(group: HTMLElement): HTMLElement | null;
/** The scrollable body of a group. */
export declare function processBody(group: HTMLElement): HTMLElement | null;
/** The outer conversation scrollport. */
export declare function outerScroller(doc?: Document): HTMLElement | null;
/** Whether the outer Chat currently follows the tail. */
export declare function followingTail(doc?: Document): boolean;
/** Process rows in the latest turn of a flow. */
export declare function latestTurnRows(root: HTMLElement): HTMLElement[];
/** Streaming assistant prose roots. */
export declare function streamingAssistantRoots(doc?: Document): HTMLElement[];
