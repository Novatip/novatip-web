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

export const config = {
  apiUrl: optionalPublic("NEXT_PUBLIC_API_URL", "http://localhost:3001/api/v1"),

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
