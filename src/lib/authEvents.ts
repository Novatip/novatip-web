/**
 * lib/authEvents.ts
 *
 * Tiny pub/sub so the plain-JS API client (lib/api.ts) can signal an
 * expired/invalid session without importing React context. WalletContext
 * subscribes and drops the session on any 401, from any endpoint.
 */

type Listener = () => void;

const listeners = new Set<Listener>();

export function onUnauthorized(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function emitUnauthorized(): void {
  // Each listener runs independently — one handler throwing must not stop
  // the others from tearing down their part of the session. The error is
  // still reported rather than silently dropped, just not left to interrupt
  // the loop.
  for (const listener of listeners) {
    try {
      listener();
    } catch (err) {
      console.error("authEvents listener threw:", err);
    }
  }
}
