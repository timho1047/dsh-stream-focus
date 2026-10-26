import type { ManualChoice } from './decision.ts';
/** Shared row ownership, manual-choice tracking and disclosure clicks. */
export declare class RowDisclosureController {
    private readonly doc;
    private readonly win;
    private readonly restoreFocus;
    private readonly autoKeys;
    private readonly manualRows;
    private depth;
    constructor(doc?: Document, win?: Window & typeof globalThis, restoreFocus?: boolean);
    start(): void;
    stop(): void;
    reset(): void;
    isAuto(key: string): boolean;
    manual(key: string): Exclude<ManualChoice, undefined> | undefined;
    markAuto(key: string): void;
    forgetAuto(key: string): void;
    /** Run an official click without recording it as a manual choice. */
    runAutomatic(action: () => void): void;
    private readonly onClick;
    private click;
}
