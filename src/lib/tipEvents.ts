/**
 * lib/tipEvents.ts
 *
 * Lightweight in-process event bus for tip lifecycle events.
 * Lets TipForm notify RecentTips and Leaderboard on success
 * without prop-drilling or a global state library.
 *
 * Usage:
 *   // emitting side (TipForm)
 *   tipEvents.emit({ fromAddress, amount, message })
 *
 *   // subscribing side (RecentTips, Leaderboard)
 *   const unsub = tipEvents.subscribe(handler)
 *   return unsub  // in a useEffect cleanup
 */

export interface TipSuccessPayload {
  /** Stellar public key of the tipper */
  fromAddress: string;
  /** Tip amount in dollars (display string, e.g. "2") */
  amount: string;
  /** Optional tip message */
  message: string;
  /** Slug of the creator who received the tip */
  slug: string;
}

type Listener = (payload: TipSuccessPayload) => void;

function createTipEventBus() {
  const listeners = new Set<Listener>();

  return {
    /** Notify all subscribers that a tip succeeded. */
    emit(payload: TipSuccessPayload): void {
      // Each listener runs independently — one handler throwing (e.g. a
      // render error surfacing out of a subscribed component) must not stop
      // the others from learning about the tip. The error is still reported
      // rather than silently dropped, just not left to interrupt emit().
      listeners.forEach((l) => {
        try {
          l(payload);
        } catch (err) {
          console.error("tipEvents listener threw:", err);
        }
      });
    },

    /** Register a listener; returns an unsubscribe function. */
    subscribe(listener: Listener): () => void {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}

export const tipEvents = createTipEventBus();
