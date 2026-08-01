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
NEXT_PUBLIC_STELLAR_NETWORK          - testnet or mainnet (default: testnet)
NEXT_PUBLIC_TIP_SPLITTER_CONTRACT_ID - Deployed tip_splitter contract ID (required)
NEXT_PUBLIC_USDC_CONTRACT_ID         - USDC Stellar Asset Contract ID

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