# novatip-web

Next.js 14 frontend for Novatip.

## Stack
Next.js 14 App Router, TypeScript 5, Tailwind CSS 3, Freighter via @novatip/sdk, qrcode.react, canvas-confetti, React context.

## Local Development
Prerequisites: Node.js >= 18, novatip-backend on port 3001, Freighter browser extension.

    npm install
    cp .env.example .env.local
    npm run dev

App available at http://localhost:3000

## Environment Variables

NEXT_PUBLIC_API_URL                  - Backend API base URL (default: http://localhost:3001/api/v1)
NEXT_PUBLIC_SITE_URL                 - Public origin this deployment is served from (default: http://localhost:3000)
NEXT_PUBLIC_STELLAR_NETWORK          - testnet or mainnet (default: testnet)
NEXT_PUBLIC_TIP_SPLITTER_CONTRACT_ID - Deployed tip_splitter contract ID (required)
NEXT_PUBLIC_USDC_CONTRACT_ID         - USDC Stellar Asset Contract ID

### NEXT_PUBLIC_SITE_URL

This one has to be set per deployment rather than once in the repo — production
gets the real domain, each preview deployment gets its own host.

It backs `metadataBase` in `src/app/layout.tsx`, which is what every relative
metadata URL is resolved against. Open Graph images are the reason it matters:
tip links spread by being pasted into Twitter, WhatsApp and Discord, and a
preview image still pointing at `localhost:3000` is one no scraper can fetch.

It must be an absolute `http` or `https` URL — `https://novatip.xyz`, not
`novatip.xyz`. A malformed value fails the build with a message naming it,
rather than falling back to localhost and shipping broken previews; see
`resolveSiteUrl` in `src/lib/config.ts`. Trailing slashes, whitespace, and any
query or fragment are normalised away, so `https://novatip.xyz` and
`https://novatip.xyz/` are equivalent.

## Key Pages

/                   - Home landing page
/[slug]             - Public tip page
/onboarding         - Creator onboarding wizard
/dashboard          - Creator earnings overview
/dashboard/splits   - Collaborator splits manager
/dashboard/qr       - QR code and share link

## Tip Flow

1.  Visitor opens /@alice
2.  Creator profile loads from backend resolver API
3.  Visitor connects Freighter wallet
4.  Visitor picks amount (///0/5 or custom) and optional message
5.  TipSplitterClient builds and simulates Soroban transaction
6.  Freighter prompts for signature
7.  Transaction confirmed on Stellar
8.  Confetti fires, success screen shown
9.  Backend indexer picks up TipReceived event within ~6 seconds
10. Dashboard analytics update live

## Onboarding Flow

1. Connect wallet (Freighter SIWS)
2. Claim unique slug (e.g. alice for /@alice)
3. Configure collaborator splits (optional)
4. Download QR code and share tip link

## Wallet Auth (SIWS)

1. Request nonce: POST /auth/challenge
2. Freighter signs the nonce
3. Verify signature: POST /auth/verify
4. JWT stored in localStorage
5. JWT attached to all authenticated API requests

## Theming

Light and dark are driven by a `dark` class on `<html>` (Tailwind `darkMode: "class"`).

The theme is applied **before the first paint** by a small blocking inline script in
the `<head>` of `src/app/layout.tsx` — `THEME_INIT_SCRIPT`, defined in `src/lib/theme.ts`.
It reads `localStorage.novatip_theme` and falls back to `prefers-color-scheme`. Because
the server render cannot know the result, `<html>` carries `suppressHydrationWarning`.

Two rules keep it flash-free:

- **Never re-derive the theme after hydration.** `ThemeToggle` reads the class the
  script already applied (`getAppliedTheme()`), it does not read storage and re-apply.
- **Style with the semantic tokens, not raw colours.** Use `bg-canvas`, `bg-surface`,
  `border-hairline`, `text-fg` / `-muted` / `-subtle` / `-faint` / `-dim`, `text-accent`,
  and `success` / `warning` / `danger`. They are CSS variables defined for both themes in
  `src/app/globals.css` and mapped in `tailwind.config.ts`; opacity modifiers still work
  (`bg-canvas/80`). Reach for a literal colour or a `dark:` variant only when a value is
  genuinely theme-independent — e.g. `text-white` on a brand-coloured button, or the QR
  code's white backing.

## Scripts

    npm run dev       - hot reload dev server
    npm run build     - production build
    npm run start     - production server
    npm run typecheck - tsc --noEmit
    npm run lint      - eslint
    npm run format    - prettier
    npm test          - run tests once (Vitest)
    npm run test:watch - run tests in watch mode

## Testing

The project uses [Vitest](https://vitest.dev) with [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/).

**Running tests**

    npm test            # single run, exits with pass/fail
    npm run test:watch  # watch mode — re-runs on file changes

**Writing tests**

Place test files next to the source they test: `src/components/Foo.test.tsx` or `src/lib/bar.test.ts`. They are picked up automatically.

Vitest globals (`describe`, `it`, `expect`, `vi`) are available without imports. `@testing-library/jest-dom` matchers (`.toBeInTheDocument()`, `.toBeDisabled()`, etc.) are loaded globally via `src/test/setup.ts`.

If a test depends on `@novatip/sdk`, the stub at `src/test/mocks/novatip-sdk.ts` is resolved automatically. To override specific exports in a single test file, use `vi.mock('@novatip/sdk', ...)`.

**CI**

`npm test` runs as part of the GitHub Actions CI pipeline defined in `.github/workflows/ci.yml`, alongside lint, typecheck, and build steps.

## License
MIT