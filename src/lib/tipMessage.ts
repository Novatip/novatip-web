/**
 * lib/tipMessage.ts
 *
 * Shared constant for the optional tip message.
 */

// FRONTEND MESSAGE BYTE LIMIT
// The contract counts UTF-8 bytes, not JavaScript UTF-16 code units.
// Clients must use the same unit to avoid accepting messages the contract rejects.
// TODO: Once the contract-side limit is exported by the SDK, import from @novatip/sdk.
export const MAX_MESSAGE_BYTES = 280;

/** Count how many UTF-8 bytes a string occupies. */
export function utf8ByteLength(str: string): number {
  return new TextEncoder().encode(str).byteLength;
}
