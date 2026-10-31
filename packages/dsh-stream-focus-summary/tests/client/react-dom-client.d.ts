/** Minimal local types for the package-local react-dom client renderer.
 * @types/react-dom is intentionally not a package dependency; the client
 * renderer is only used by this package's tests. */
declare module 'react-dom/client' {
  import type { ReactNode } from 'react'

  export interface Root {
    render(children: ReactNode): void
    unmount(): void
  }

  export function createRoot(container: Element | DocumentFragment): Root
}
