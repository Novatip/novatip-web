/**
 * lib/config.ts
 *
 * Centralised environment config for novatip-web.
 *
 * NEXT_PUBLIC_ vars are inlined at build time by Next.js, so validation here
 * runs during `next build` (server bundle evaluation) as well as at server
 * boot — failing fast before any request is served.
 *
 * Variables are split into two groups:
 *   requirePublic — must be present and non-empty; throws at build/boot if not
 *   optionalPublic — safe to omit; falls back to a documented default
 */

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Return the value of a required NEXT_PUBLIC_ environment variable.
 * Throws at module evaluation time (build or server start) if the variable
 * is absent or empty, naming it explicitly so the error is actionable.
 */
function requirePublic(key: string, val: string | undefined): string {
  if (!val) {
    throw new Error(
      `Missing required environment variable: ${key}\n` +
      `Copy .env.example to .env.local and set a value for this variable.`,
    );
  }
  return val;
}

/**
 * Return the value of an optional NEXT_PUBLIC_ variable, falling back to
 * `fallback` when absent or empty.
 */
function optionalPublic(val: string | undefined, fallback: string): string {
  return val || fallback;
}

/**
 * Validate that `value` looks like a Stellar/Soroban contract ID:
 * a 56-character base-32 string beginning with "C".
 *
 * Throws at build/boot so a mis-configured contract ID surfaces immediately
 * rather than at the moment a supporter presses the Tip button.
 */
function requireContractId(key: string, raw: string | undefined): string {
  const val = requirePublic(key, raw);
  if (!/^C[A-Z2-7]{55}$/.test(val)) {
    throw new Error(
      `Invalid value for ${key}: ${JSON.stringify(val)}\n` +
      `Expected a 56-character Soroban contract ID starting with "C" ` +
      `(e.g. CAAAA…AAAA).`,
    );
  }
  return val;
}

// ── Site URL ──────────────────────────────────────────────────────────────────

/** Where the app runs when nothing says otherwise — i.e. `npm run dev`. */
export const DEFAULT_SITE_URL = "http://localhost:3000";

/**
 * Normalise the public origin this deployment is served from.
 *
 * Next resolves every relative metadata URL — Open Graph images above all —
 * against this. Get it wrong and social previews point at localhost, which
 * matters more here than it does for most apps: tip links spread by being
 * pasted into Twitter, WhatsApp and Discord, so a preview that will not load
 * is lost reach.
 *
 * Rejects anything that is not an absolute http(s) URL rather than quietly
 * falling back, because the fallback is localhost and a silent localhost in
 * production is exactly the failure this variable exists to prevent. The root
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

// ── Config object ─────────────────────────────────────────────────────────────

export const config = {
  /**
   * Backend API base URL.
   * Defaults to localhost in development; set NEXT_PUBLIC_API_URL in
   * production deployments.
   */
  apiUrl: optionalPublic(
    process.env.NEXT_PUBLIC_API_URL,
    "http://localhost:3001/api/v1",
  ),

  /**
   * Public origin of this deployment — see resolveSiteUrl above.
   *
   * Read as a literal member access, not through optionalPublic(): only
   * `process.env.NEXT_PUBLIC_FOO` written out in full is substituted into the
   * client bundle at build time, so a dynamic lookup would come back undefined
   * in the browser.
   */
  siteUrl: resolveSiteUrl(process.env.NEXT_PUBLIC_SITE_URL),

  stellar: {
    /**
     * Stellar network to connect to.
     * Defaults to "testnet"; set to "mainnet" for production.
     */
    network: optionalPublic(
      process.env.NEXT_PUBLIC_STELLAR_NETWORK,
      "testnet",
    ) as "testnet" | "mainnet" | "local",

    /**
     * Soroban contract ID of the deployed tip_splitter contract.
     * REQUIRED — the app cannot process tips without it.
     * Validated at build/boot: must be a 56-character string starting with "C".
     */
    tipSplitterContractId: requireContractId(
      "NEXT_PUBLIC_TIP_SPLITTER_CONTRACT_ID",
      process.env.NEXT_PUBLIC_TIP_SPLITTER_CONTRACT_ID,
    ),

    /**
     * USDC Stellar Asset Contract ID.
     * Defaults to the well-known testnet/mainnet USDC SAC address.
     */
    usdcContractId: optionalPublic(
      process.env.NEXT_PUBLIC_USDC_CONTRACT_ID,
      "CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWFEIE3USCIHMXQDAMA",
    ),
  },
} as const;
