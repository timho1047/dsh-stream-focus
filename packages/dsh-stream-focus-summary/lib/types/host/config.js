/**
 * Loader-visible configuration for the summary Host service.
 *
 * The schema is the single source of defaults and bounds. `modelOverride` is
 * optional as a whole, but once present both route fields are required so a
 * half-configured pair fails at the configuration boundary instead of being
 * treated as "follow the Session model".
 */
import z from '@deepseek-ai/schemastery';
const modelOverrideSchema = z.object({
    provider: z.string().min(1).pattern(/\S/).required(),
    model: z.string().min(1).pattern(/\S/).required(),
});
// Nested object schemas default to `{}`, which would make an absent override
// fail its required fields. `undefined` is the runtime default that keeps the
// pair absent; schemastery's `default` type omits that sentinel.
const optionalModelOverrideSchema = modelOverrideSchema.default(undefined);
/** Public summary row configuration; defaults make the input side partial. */
export const Config = z.object({
    maxChars: z.natural().min(10).max(80).default(30).volatile(),
    maxTokens: z.natural().min(256).max(4000).default(800).volatile(),
    modelOverride: optionalModelOverrideSchema.volatile(),
});
//# sourceMappingURL=config.js.map