/**
 * lib/copy.ts
 *
 * User-facing claims that depend on how the contract is deployed.
 */

/**
 * The "no platform fees" claim shown in the tip form footer and on the tip
 * success screen.
 *
 * This is only true while the tip_splitter contract's optional protocol fee is
 * switched off. The contract can enable one (see the `FeeTooHigh` error and the
 * `set-fee.sh` script in the contracts repository). When a fee is turned on,
 * change this one constant; both components read it.
 */
export const NO_PLATFORM_FEES_COPY = "No platform fees";
