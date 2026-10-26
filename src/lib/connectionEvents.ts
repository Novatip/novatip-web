/**
 * lib/connectionEvents.ts
 *
 * Tiny pub/sub so the plain-JS API client (lib/api.ts) can report whether the
 * backend is reachable without importing React context. ConnectionProvider
 * subscribes and drives the "backend unreachable" banner from it.
 *
 * A failure means no HTTP response arrived at all (network error or timeout);
 * a success means the server answered, whatever the status code.
 */

type Listener = () => void;

const failureListeners = new Set<Listener>();
const successListeners = new Set<Listener>();

function emit(listeners: Set<Listener>): void {
  // Each listener runs independently — one throwing must not stop the rest.
  for (const listener of listeners) {
    try {
      listener();
    } catch (err) {
      console.error("connectionEvents listener threw:", err);
    }
  }
}

export function onConnectionFailure(listener: Listener): () => void {
  failureListeners.add(listener);
  return () => failureListeners.delete(listener);
}

export function onConnectionSuccess(listener: Listener): () => void {
  successListeners.add(listener);
  return () => successListeners.delete(listener);
}

export function emitConnectionFailure(): void {
  emit(failureListeners);
}

export function emitConnectionSuccess(): void {
  emit(successListeners);
}
