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

/** Testnet USDC Stellar Asset Contract address. */
export const TESTNET_USDC_CONTRACT_ID = "CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWFEIE3USCIHMXQDAMA";

/**
 * Resolve the USDC contract ID with network-aware validation.
 *
 * - A provided value is validated as a well-formed contract ID regardless of network.
 * - On mainnet the variable is required — the testnet address does not exist there,
 *   so a silent fallback would produce broken balance reads and trustline checks.
 * - On testnet and local the testnet USDC SAC is used when the variable is absent.
 */
export function resolveUsdcContractId(
  raw: string | undefined,
  network: StellarNetwork,
): string {
  if (raw) {
    if (!StrKey.isValidContract(raw)) {
      throw new Error(
        `Invalid value for NEXT_PUBLIC_USDC_CONTRACT_ID: ${JSON.stringify(raw)}\n` +
        `Expected a 56-character Soroban contract ID starting with "C" ` +
        `(e.g. CAAAA…BSC4).`,
      );
    }
    return raw;
  }
  if (network === "mainnet") {
    throw new Error(
      `Missing required environment variable: NEXT_PUBLIC_USDC_CONTRACT_ID\n` +
      `On mainnet this variable is required — the testnet default does not exist ` +
      `there. Copy .env.example to .env.local and set the mainnet USDC SAC address.`,
    );
  }
  return TESTNET_USDC_CONTRACT_ID;
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

// ── API URL ───────────────────────────────────────────────────────────────────

/** Localhost fallback used in development and test when NEXT_PUBLIC_API_URL is unset. */
export const DEFAULT_API_URL = "http://localhost:3001/api/v1";

/**
 * Resolve the backend API base URL with environment-aware validation.
 *
 * - A provided value must be an absolute http(s) URL; anything else throws.
 * - In production (NODE_ENV === "production") a missing value throws rather
 *   than silently routing every request to the visitor's own machine.
 * - In development and test the localhost default still applies so local
 *   dev and CI work without setting the variable.
 */
export function resolveApiUrl(raw: string | undefined): string {
  const value = raw?.trim();

  if (!value) {
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        `Missing required environment variable: NEXT_PUBLIC_API_URL\n` +
        `Set it to the backend API base URL, ` +
        `e.g. https://api.example.com/api/v1`,
      );
    }
    return DEFAULT_API_URL;
  }

  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error(
      `Invalid NEXT_PUBLIC_API_URL: ${JSON.stringify(value)}. ` +
      `Expected an absolute URL including the scheme, ` +
      `e.g. https://api.example.com/api/v1`,
    );
  }

  if (url.protocol !== "https:" && url.protocol !== "http:") {
    throw new Error(
      `Invalid NEXT_PUBLIC_API_URL: ${JSON.stringify(value)}. ` +
      `Expected an http or https URL, got ${url.protocol.replace(":", "")}.`,
    );
  }

  return value;
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

// Resolved ahead of the config object so usdcContractId can depend on the
// network value without a forward reference inside the same object literal.
const stellarNetwork = requireNetwork(
  "NEXT_PUBLIC_STELLAR_NETWORK",
  process.env.NEXT_PUBLIC_STELLAR_NETWORK,
  "testnet",
);

export const config = {
  /**
   * Backend API base URL.
   * Defaults to localhost in development and test; required in production.
   * See resolveApiUrl above.
   */
  apiUrl: resolveApiUrl(process.env.NEXT_PUBLIC_API_URL),

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
    network: stellarNetwork,

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
     * Required on mainnet; defaults to the well-known testnet USDC SAC address
     * on testnet and local. A provided value is validated as a contract ID.
     * See resolveUsdcContractId above.
     */
    usdcContractId: resolveUsdcContractId(
      process.env.NEXT_PUBLIC_USDC_CONTRACT_ID,
      stellarNetwork,
    ),
  },
} as const;
