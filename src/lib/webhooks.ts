/** Webhook endpoints must use HTTPS before they can receive tip events. */
export function isValidHttpsUrl(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) return false;
  try {
    return new URL(trimmed).protocol === "https:";
  } catch {
    return false;
  }
}

/** Check if a webhook URL appears to target a private or local address. */
export function isPublicWebhookUrl(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) return false;
  
  try {
    const url = new URL(trimmed);
    const hostname = url.hostname.toLowerCase();
    
    // Check for localhost
    if (hostname === "localhost" || hostname.endsWith(".local")) {
      return false;
    }
    
    // Check for IPv4 private ranges
    const ipv4Match = hostname.match(/^(\d+)\.(\d+)\.(\d+)\.(\d+)$/);
    if (ipv4Match) {
      const [, a, b] = ipv4Match.map(Number);
      // 10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16, 127.0.0.0/8
      if (a === 10 || a === 127 || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168)) {
        return false;
      }
    }
    
    return true;
  } catch {
    return false;
  }
}
