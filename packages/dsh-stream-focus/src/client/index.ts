/** Browser half: drive the Standard-mode process window from the live Chat DOM. */
import type { Context as ClientContext } from '@deepseek-ai/cordis'
import { createSnapshotStore } from '@deepseek-ai/dsh-client-store'
// Type-only: the `ctx.configForms` Context merge and its accepted-value shape.
import type { ConfigFormSnapshot } from '@deepseek-ai/dsh-client-ui-settings/client'
// Type-only: the renderer-owned slots service and the reasoning Body Slot contract.
import type {} from '@deepseek-ai/dsh-client-ui-renderer/client'
import type {} from '@deepseek-ai/dsh-client-ui-chat/client'
import { StreamWindowConductor } from './conductor.ts'
import { PacedReasoningBody } from './paced-body.tsx'
import { NormalOutputSmoother } from './normal-smoothing.ts'
import { FlatRowConductor } from './flat-rows.ts'
import { conductorFor, resolveMode } from './mode-policy.ts'

/** Required services: shared Settings forms and the Slot registry. */
export const inject = ['configForms', 'slots']

interface ChatSettings {
  readonly transcriptView?: string | null
}


/**
 * Mount the mode-appropriate row conductor, the paced reasoning renderer, and
 * the normal-output smoother. Settings not yet accepted start nothing.
 * @param ctx - Client root context.
 */
export function apply(ctx: ClientContext): void {
  const pacing = createSnapshotStore(false)
  ctx.slots.inject('conversation.chat.reasoning.body', () => ctx.slots.register({
    name: 'conversation.chat.reasoning.body',
    priority: 10,
    inject: () => ({ hooks: { pacing } }),
  }, PacedReasoningBody))

  const form = ctx.configForms.get<ChatSettings>('ui-chat')
  let conductor: StreamWindowConductor | null = null
  let flat: FlatRowConductor | null = null
  let smoother: NormalOutputSmoother | null = null
  const reconcile = (): void => {
    const mode = resolveConfiguredMode(form.getSnapshot())
    pacing.set(mode !== null)
    const grouped = mode !== null && conductorFor(mode) === 'grouped'
    const flatMode = mode === 'detailed' || mode === 'verbose'
    if (grouped && conductor === null) {
      conductor = new StreamWindowConductor()
      conductor.start()
    } else if (!grouped && conductor !== null) {
      conductor.stop()
      conductor = null
    }
    if (flatMode && flat === null) {
      flat = new FlatRowConductor(mode)
      flat.start()
    } else if (!flatMode && flat !== null) {
      flat.stop()
      flat = null
    }
    if (mode !== null && smoother === null) {
      smoother = new NormalOutputSmoother()
      smoother.start()
    } else if (mode === null && smoother !== null) {
      smoother.stop()
      smoother = null
    }
  }

  ctx.effect(() => {
    const unsubscribe = form.subscribe(reconcile)
    reconcile()
    return () => {
      unsubscribe()
      conductor?.stop()
      conductor = null
      smoother?.stop()
      smoother = null
      flat?.stop()
      flat = null
    }
  }, 'stream-focus: mode conductors')
}

/** Resolve the configured mode, or null while the settings snapshot is not ready. */
function resolveConfiguredMode(snapshot: ConfigFormSnapshot<ChatSettings>): ReturnType<typeof resolveMode> | null {
  if (snapshot.status === 'loading') return null
  return resolveMode((snapshot.value as ChatSettings | undefined)?.transcriptView, 'dshDesktop' in globalThis)
}
