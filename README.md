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

Copy `.env.example` to `.env.local` and fill in the values before running `npm run dev`.

Variables marked **required** are validated at build/boot time. The app throws a
descriptive error naming the variable if one is absent or malformed — the failure
happens before any request is served, not mid-funnel when a supporter presses Tip.

| Variable | Required | Default | Notes |
|---|---|---|---|
| `NEXT_PUBLIC_TIP_SPLITTER_CONTRACT_ID` | **yes** | — | 56-char Soroban contract ID starting with `C`. Missing or malformed → build/boot error. |
| `NEXT_PUBLIC_API_URL` | no | `http://localhost:3001/api/v1` | Backend API base URL. Override in staging/production. |
| `NEXT_PUBLIC_SITE_URL` | no | `http://localhost:3000` | Public origin for Open Graph `metadataBase`. Must be an absolute `http(s)` URL. A malformed value fails the build. |
| `NEXT_PUBLIC_STELLAR_NETWORK` | no | `testnet` | `testnet` or `mainnet`. |
| `NEXT_PUBLIC_USDC_CONTRACT_ID` | no | `CBIELTK6…QDAMA` | USDC SAC address. Override only for custom local networks. |

### NEXT_PUBLIC_TIP_SPLITTER_CONTRACT_ID

This is the only variable that is truly required. Without it the SDK cannot
build a transaction and the tip button will always throw. The validation in
`src/lib/config.ts` catches both a missing value and a malformed one (wrong
length, wrong prefix) at the time the config module is first evaluated — during
`next build` or at server startup — so a misconfiguration fails loudly before
any user sees the app.

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

## Accessibility

Novatip is used on mobile, with keyboard navigation, and by screen-reader users.
Every contributor is expected to apply the following checklist before opening a
pull request. Reviewers should use it as a concrete rubric.

### Checklist

**Labels**
- Every interactive element has an accessible name: a visible label, an
  `aria-label`, or an `aria-labelledby` pointing at a visible element.
- Icon-only buttons always have `aria-label` (search the codebase for existing
  examples in `WalletConnectButton` and `ThemeToggle`).
- Form inputs are associated with a `<label>` via `htmlFor`/`id`, or have
  `aria-label` when a visible label is impractical.

**Focus order**
- Tab order follows the visual reading order. Do not use `tabindex` values
  greater than `0`.
- Dialogs, drawers, and popovers trap focus while open and return it to the
  trigger on close.
- No interactive element is reachable only via pointer (hover menus, etc.).

**Visible focus states**
- The focused element is clearly visible at all times. Do not suppress the
  default outline without providing a custom one.
- Use the `focus:ring-2 focus:ring-brand-500/50` utility pattern already used
  in `CopyFallback` and `Input` rather than `outline-none` alone.

**Colour contrast**
- Body text meets WCAG AA (4.5 : 1 against its background).
- Large text and UI components meet AA (3 : 1).
- Use the semantic colour tokens (`text-fg`, `text-fg-subtle`, `text-accent`,
  etc.) rather than raw Tailwind colours — they are already contrast-checked for
  both light and dark themes.
- Never rely on colour alone to convey state: pair it with an icon, label, or
  pattern.

**Announcing dynamic changes**
- Loading states that replace content use `aria-live="polite"` or a visually
  hidden status message so screen readers announce the update.
- Error messages use `role="alert"` (see `CopyFallback` for an example).
- Toast-style confirmations ("Copied!") should also carry `role="status"` or
  `aria-live="polite"`.
- After a form submission, focus moves to the confirmation or error message so
  keyboard users know what happened.

### Local tooling

| Tool | How to run | What it catches |
|------|-----------|----------------|
| **axe DevTools** (browser extension) | Open DevTools → axe tab → Analyze | Missing labels, contrast failures, ARIA misuse |
| **Lighthouse** | DevTools → Lighthouse → Accessibility | WCAG automated audit, score and issue list |
| **Keyboard-only walkthrough** | Unplug/ignore the mouse, Tab through the page | Focus traps, focus order, missing focus rings |
| **Screen reader** | macOS VoiceOver (`⌘ F5`), Windows NVDA (free), or Android TalkBack | Label quality, live-region announcements, interactive element names |
| **`eslint-plugin-jsx-a11y`** | `npm run lint` (already included via `eslint-config-next`) | Common JSX accessibility mistakes at author time |

Full WCAG 2.1 AA compliance requires manual testing with assistive technologies
in addition to automated tools — automated tools catch roughly 30–40 % of issues.

## License
MIT