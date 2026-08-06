/**
 * lib/config.ts
 *
 * Centralised environment config for novatip-web.
 * All NEXT_PUBLIC_ vars are validated at module load time so the app
 * fails fast with a clear message rather than a cryptic runtime error.
 */

function requirePublic(key: string): string {
  const val = process.env[key];
  if (!val) throw new Error(`Missing required env var: ${key}`);
  return val;
}

function optionalPublic(key: string, fallback: string): string {
  return process.env[key] ?? fallback;
}

/** Where the app runs when nothing says otherwise — i.e. `npm run dev`. */
export const DEFAULT_SITE_URL = "http://localhost:3000";

/**
 * Normalise the public origin this deployment is served from.
 *
 * Next resolves every relative metadata URL — Open Graph images above all —
 * against this.  Get it wrong and social previews point at localhost, which
 * matters more here than it does for most apps: tip links spread by being
 * pasted into Twitter, WhatsApp and Discord, so a preview that will not load
 * is lost reach.
 *
 * Rejects anything that is not an absolute http(s) URL rather than quietly
 * falling back, because the fallback is localhost and a silent localhost in
 * production is exactly the failure this variable exists to prevent.  The root
 * layout is evaluated during `next build`, so a bad value fails CI, not users.
 */
export function resolveSiteUrl(raw: string | undefined): string {
  const value = raw?.trim();
  if (!value) return DEFAULT_SITE_URL;

  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error(
      `Invalid NEXT_PUBLIC_SITE_URL: ${JSON.stringify(value)}. ` +
      `Expected an absolute URL including the scheme, e.g. https://novatip.xyz`,
    );
  }

  if (url.protocol !== "https:" && url.protocol !== "http:") {
    throw new Error(
      `Invalid NEXT_PUBLIC_SITE_URL: ${JSON.stringify(value)}. ` +
      `Expected an http or https URL, got ${url.protocol.replace(":", "")}.`,
    );
  }

  // A base carries no query or fragment; drop them so a stray "?" in a
  // deployment variable cannot end up glued onto every generated image URL.
  url.search = "";
  url.hash   = "";

  return url.href;
}

export const config = {
  apiUrl: optionalPublic("NEXT_PUBLIC_API_URL", "http://localhost:3001/api/v1"),

  /**
   * Public origin of this deployment — see resolveSiteUrl.
   *
   * Read as a literal member access, not through optionalPublic(): only
   * `process.env.NEXT_PUBLIC_FOO` written out in full is substituted into the
   * client bundle at build time, so a dynamic lookup would come back undefined
   * in the browser.
   */
  siteUrl: resolveSiteUrl(process.env.NEXT_PUBLIC_SITE_URL),

  stellar: {
    network: optionalPublic(
      "NEXT_PUBLIC_STELLAR_NETWORK",
      "testnet",
    ) as "testnet" | "mainnet" | "local",

    tipSplitterContractId: optionalPublic(
      "NEXT_PUBLIC_TIP_SPLITTER_CONTRACT_ID",
      "",
    ),

    usdcContractId: optionalPublic(
      "NEXT_PUBLIC_USDC_CONTRACT_ID",
      "CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWFEIE3USCIHMXQDAMA",
    ),
  },
} as const;
