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
 *
 * IMPORTANT — NEXT_PUBLIC_ variables must be read as literal member accesses:
 *   process.env.NEXT_PUBLIC_FOO          ✓ inlined at build time
 *   process.env[key]                     ✗ always undefined in the browser
 *   process.env[`NEXT_PUBLIC_${name}`]   ✗ always undefined in the browser
 *
 * Next.js substitutes these values by matching the exact literal text in the
 * source. A computed lookup is never replaced and comes back undefined in the
 * browser while continuing to work in `npm run dev` (where Node reads the real
 * process.env). See the "How NEXT_PUBLIC_ variables are read" section in the
 * README before refactoring this file.
 */

import { StrKey } from "@stellar/stellar-sdk";

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

const STELLAR_NETWORKS = ["testnet", "mainnet", "local"] as const;
type StellarNetwork = (typeof STELLAR_NETWORKS)[number];

/**
 * Validate that `val` is one of the accepted Stellar network names.
 * Falls back to `fallback` when absent, and throws at build/boot if the
 * value is present but unrecognised — the same pattern as requireContractId.
 */
function requireNetwork(
  key: string,
  val: string | undefined,
  fallback: StellarNetwork,
): StellarNetwork {
  const raw = val || fallback;
  if (!(STELLAR_NETWORKS as readonly string[]).includes(raw)) {
    throw new Error(
      `Invalid value for ${key}: ${JSON.stringify(raw)}\n` +
      `Accepted values: ${STELLAR_NETWORKS.join(", ")}.`,
    );
  }
  return raw as StellarNetwork;
}

/**
 * Validate that `value` looks like a Stellar/Soroban contract ID:
 * a 56-character base-32 strkey beginning with "C" with a valid checksum.
 *
 * Throws at build/boot so a mis-configured contract ID surfaces immediately
 * rather than at the moment a supporter presses the Tip button.
 */
function requireContractId(key: string, raw: string | undefined): string {
  const val = requirePublic(key, raw);
  if (!StrKey.isValidContract(val)) {
    throw new Error(
      `Invalid value for ${key}: ${JSON.stringify(val)}\n` +
      `Expected a 56-character Soroban contract ID starting with "C" ` +
      `(e.g. CAAAA…BSC4).`,
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

// ── API request timeout ───────────────────────────────────────────────────────

/**
 * Default timeout for a backend API request, in milliseconds.
 *
 * The novatip-backend runs on a free tier that sleeps when idle, so a cold
 * start regularly takes several seconds longer than a warm request. Ten
 * seconds gives that cold start room to finish without leaving a genuinely
 * stuck request hanging too long. Callers that know a particular request is
 * slower or faster still than this can pass their own `timeout` in
 * RequestOptions.
 */
export const DEFAULT_REQUEST_TIMEOUT_MS = 10_000;

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
     * An unrecognised value throws at build/boot naming the variable and the
     * accepted values — same fail-fast policy as requireContractId.
     */
    network: requireNetwork(
      "NEXT_PUBLIC_STELLAR_NETWORK",
      process.env.NEXT_PUBLIC_STELLAR_NETWORK,
      "testnet",
    ),

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
