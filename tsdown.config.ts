import { clientBundle, nodeBundle } from './tsdown.client.ts'

/**
 * Two build faces over the tsc-emitted `lib/types` tree:
 *
 * - node face:   `lib/types/index.js`        → `lib/index.js`  (Host Loader entry)
 * - client face: `lib/types/client/index.js` → `lib/client.js` (browser ModuleLoader bundle)
 *
 * The client half has no non-baseline runtime imports; state is read from the
 * live Chat DOM and the shared `configForms` service.
 */
export default [
  ...nodeBundle('dsh-stream-focus', ['lib/types/index.js']),
  clientBundle('dsh-stream-focus', { entry: 'lib/types/client/index.js' }),
]
