/**
 * Loader-visible configuration for the summary Host service.
 *
 * The schema is the single source of defaults and bounds. `modelOverride` is
 * optional as a whole, but once present both route fields are required so a
 * half-configured pair fails at the configuration boundary instead of being
 * treated as "follow the Session model".
 */
import z from '@deepseek-ai/schemastery';
import type { Volatile } from '@deepseek-ai/cordis';
import type { ModelRef } from '../shared/protocol.ts';
/** Live row configuration read through Loader-owned volatile references. */
export interface Config {
    readonly maxChars: Volatile<number>;
    readonly maxTokens: Volatile<number>;
    readonly modelOverride: Volatile<ModelRef | undefined>;
}
/** Public summary row configuration; defaults make the input side partial. */
export declare const Config: z<Schemastery.ObjectS<NoInfer<{
    maxChars: z<number, number, "volatile-defined">;
    maxTokens: z<number, number, "volatile-defined">;
    modelOverride: z<NoInfer<Schemastery.ObjectS<NoInfer<{
        provider: z<string, string, "defined">;
        model: z<string, string, "defined">;
    }>>>, NoInfer<Schemastery.ObjectT<NoInfer<{
        provider: z<string, string, "defined">;
        model: z<string, string, "defined">;
    }>>>, "volatile-defined">;
}>>, Schemastery.ObjectT<NoInfer<{
    maxChars: z<number, number, "volatile-defined">;
    maxTokens: z<number, number, "volatile-defined">;
    modelOverride: z<NoInfer<Schemastery.ObjectS<NoInfer<{
        provider: z<string, string, "defined">;
        model: z<string, string, "defined">;
    }>>>, NoInfer<Schemastery.ObjectT<NoInfer<{
        provider: z<string, string, "defined">;
        model: z<string, string, "defined">;
    }>>>, "volatile-defined">;
}>>, "plain">;
