/** Webhook endpoints must use HTTPS before they can receive tip events. */
export function isValidHttpsUrl(value: string): boolean {
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}
