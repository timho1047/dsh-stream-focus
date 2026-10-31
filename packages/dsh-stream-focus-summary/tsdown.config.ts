import { clientBundle, nodeBundle } from '../../build/tsdown.client.ts'

export default [
  ...nodeBundle('dsh-stream-focus-summary', ['lib/types/index.js']),
  clientBundle('dsh-stream-focus-summary', { entry: 'lib/types/client/index.js' }),
]
