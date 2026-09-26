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

## Troubleshooting

### `Error: Missing required environment variable: NEXT_PUBLIC_TIP_SPLITTER_CONTRACT_ID`

**Cause:** The contract ID was not set before starting the dev server. The config
module is evaluated at server start (and during `next build`), so a missing value
throws immediately — before any page is served.

**Fix:** Copy `.env.example` to `.env.local` and set `NEXT_PUBLIC_TIP_SPLITTER_CONTRACT_ID`
to the 56-character Soroban contract address returned when you deployed the
`tip_splitter` contract. If you have not deployed it yet, see the
[novatip-backend](https://github.com/Novatip/novatip-backend) README for the
`stellar contract deploy` step.

---

### `Cannot find module '@novatip/sdk'` (or its type declarations)

**Cause:** The SDK is declared as a `file:../novatip-sdk` dependency, so it
resolves to a sibling directory checkout rather than a registry package. The
package exports from `./dist/index.js` — if that folder does not exist yet
(a fresh clone has no `dist/`), Node cannot resolve the import and `npm run dev`
fails before the server starts.

**Fix:**

    # in the sibling SDK checkout
    cd ../novatip-sdk
    npm install
    npm run build

    # back in this repo
    cd ../novatip-web
    npm install     # re-links the built package into node_modules
    npm run dev

---

### Every dashboard panel shows an error immediately on load

**Cause:** The frontend fetches data from `NEXT_PUBLIC_API_URL` (default
`http://localhost:3001/api/v1`). If the backend is not running, every component
that calls `lib/api.ts` receives a network error and renders its error state.

**Fix:** Start the backend. See the
[novatip-backend](https://github.com/Novatip/novatip-backend) README for how to
bring it up (PostgreSQL, Redis and a database migration are needed first). If
your backend is on a different port, set `NEXT_PUBLIC_API_URL` in `.env.local`
before restarting the dev server.

---

### Transaction fails with "wrong network" or Freighter shows a network mismatch warning

**Cause:** Freighter is connected to a different Stellar network than the one
the app targets (`NEXT_PUBLIC_STELLAR_NETWORK`, default `testnet`). The mismatch
is detected at signing time, after the transaction has already been built and
simulated — the error only appears when the user clicks **Tip**.

**Fix:** Open Freighter, go to **Settings → Network**, and switch to the same
network the app uses. For local development that is almost always **Testnet**. If
you are running against a private Futurenet node, set
`NEXT_PUBLIC_STELLAR_NETWORK=futurenet` (and `NEXT_PUBLIC_USDC_CONTRACT_ID` to
match) in `.env.local`.

---

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

## Adding a UI component

This section walks through building a new component so it inherits the active
theme rather than hardcoding colours that break in one mode.

### Use the semantic tokens, not raw Tailwind colours

Every component in `src/components/ui/` is built with the token classes defined
in `tailwind.config.ts` and `src/app/globals.css`. They resolve to different CSS
variable values in light and dark:

| Token class | Light | Dark |
|---|---|---|
| `bg-canvas` | slate-50 | gray-950 |
| `bg-surface` | white | gray-900 |
| `bg-surface-strong` | slate-100 | gray-800 |
| `border-hairline` | slate-200 | near-gray-800 |
| `text-fg` | slate-900 | gray-100 |
| `text-fg-muted` | slate-700 | gray-300 |
| `text-fg-subtle` | slate-600 | gray-400 |
| `text-accent` | brand-600 | brand-400 |
| `text-success` / `bg-success` | green-600 | green-400 |
| `text-warning` / `bg-warning` | yellow-600 | yellow-400 |
| `text-danger` / `bg-danger` | red-600 | red-400 |

**Opacity modifiers work on all of them:** `bg-success/20`, `border-danger/30`,
`text-fg-muted/80` all resolve correctly in both themes.

### What to avoid

- **Raw slate/gray/zinc colours** such as `text-slate-900`, `bg-gray-100`,
  `border-zinc-200` — these are fixed values that do not change with the theme.
  A `text-slate-900` heading is invisible against a dark canvas.
- **`dark:` variants on literal colours** such as `text-slate-900 dark:text-white` —
  this pattern works for simple cases but proliferates as the component grows and
  is impossible to audit at a glance. Use the token instead and remove the
  `dark:` override entirely.
- **Hardcoded hex or RGB** in `style={{ color: "#0f172a" }}` or similar — same
  problem, but even harder to catch in review.

### Worked example — a `StatusBanner` component

```tsx
// src/components/ui/StatusBanner.tsx
import { cn } from "@/lib/utils";

type Variant = "info" | "success" | "warning" | "error";

const styles: Record<Variant, string> = {
  info:    "bg-accent/10    text-accent   border-accent/20",
  success: "bg-success/10  text-success  border-success/20",
  warning: "bg-warning/10  text-warning  border-warning/20",
  error:   "bg-danger/10   text-danger   border-danger/20",
};

interface StatusBannerProps {
  variant?: Variant;
  children: React.ReactNode;
  className?: string;
}

export function StatusBanner({ variant = "info", children, className }: StatusBannerProps) {
  return (
    <div
      role="status"
      className={cn(
        "rounded-lg border px-4 py-3 text-sm font-medium",
        styles[variant],
        className,
      )}
    >
      {children}
    </div>
  );
}
```

Notice:
- Every colour is a token. No `dark:` overrides are needed.
- Opacity modifiers (`/10`, `/20`) give tinted backgrounds without adding a new
  CSS variable.
- The `role="status"` keeps it accessible — see the Accessibility section.

### Verifying in both themes before submitting

1. Run `npm run dev` and open `http://localhost:3000`.
2. Click the theme toggle to switch to dark mode.
3. Inspect the component in both modes — look for text that disappears, borders
   that vanish, or backgrounds that clash.
4. If you added a `dark:` variant on a raw colour, that is a sign to reach for a
   token instead.

---

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

## Client-side architecture

### State layers

There are three places state can live. Use the right one for the job.

**`WalletContext` (`src/contexts/WalletContext.tsx`)**

The single source of truth for identity. It holds:

| Field | What it is |
|-------|-----------|
| `publicKey` | The connected Stellar address, or `null` |
| `jwt` | The creator session JWT issued by the backend, or `null` |
| `isConnected` | Convenience boolean — `!!publicKey` |
| `isConnecting` | True while the Freighter + SIWS round trip is in flight |
| `error` | The last connection or sign-in error message, or `null` |

`publicKey` and `jwt` are persisted to `localStorage` and rehydrated on mount.
They are separate because a visitor who only wants to tip needs a wallet
connection but never needs a creator JWT.

Put state here only if it must survive navigation or must be visible to
unrelated parts of the tree at the same time. Everything else belongs closer to
the component that uses it.

**Per-component fetching**

Dashboard pages and widgets fetch their own data with `useEffect` + `AbortController`.
Each component is responsible for its own loading, error, and data states.
This is intentional: the pages are independent, they load in parallel, and an
error in one should never block the others.

The pattern every dashboard page follows:

```ts
const abortControllerRef = useRef<AbortController | null>(null);

useEffect(() => {
  if (!jwt) return;
  // cancel any in-flight request for this component
  abortControllerRef.current?.abort();
  const controller = new AbortController();
  abortControllerRef.current = controller;

  setLoading(true);
  someApi.someMethod(jwt, { signal: controller.signal })
    .then(setData)
    .catch((e) => { if (e.code !== "ABORTED") setError(e.message); })
    .finally(() => {
      if (abortControllerRef.current === controller) {
        abortControllerRef.current = null;
        setLoading(false);
      }
    });

  return () => { abortControllerRef.current?.abort(); };
}, [jwt]);
```

The `sessionKey` on the dashboard layout's `<main>` remounts all children
whenever the connected wallet changes, so stale data from a previous creator
session is never shown.

**Local component state**

Ephemeral UI state (open/closed, form values, hover, copy status) lives in
`useState` inside the component that owns it. It is never promoted unless two
unrelated components genuinely need to react to the same change.

---

### Event buses

Two tiny pub/sub buses in `src/lib/` decouple things that cannot share a React
ancestor without prop-drilling or an unnecessary shared context.

**`tipEvents` (`src/lib/tipEvents.ts`)**

Carries a `TipSuccessPayload` (`fromAddress`, `amount`, `message`) after a tip
transaction is confirmed on-chain.

- **Emitter:** `TipForm` — after the Soroban transaction is confirmed.
- **Subscribers:** `RecentTips` and `Leaderboard` — they prepend the new tip
  optimistically rather than waiting for the backend indexer (~6 s).

Without this bus, `TipForm` would have to lift its success state up to a common
ancestor of `RecentTips` and `Leaderboard`, which are on a completely different
page (`/dashboard`). The bus is the right scope for a one-way broadcast with no
shared ancestor.

**`authEvents` (`src/lib/authEvents.ts`)**

Carries a single signal: `emitUnauthorized()`.

- **Emitter:** `lib/api.ts` — on any HTTP 401 from any endpoint.
- **Subscriber:** `WalletContext` — clears the JWT and public key so every
  dashboard widget drops its auth state at once.

This bus exists because `lib/api.ts` is a plain TypeScript module with no React
dependency. It cannot call `useWallet()` directly. The bus keeps the API client
framework-agnostic while still letting one 401 tear down the whole session.

> **Before adding a new event bus:** check whether `WalletContext` or a
> lifted state in the nearest common ancestor already covers the need.
> The buses exist to solve a specific structural problem, not as a general
> state-sharing mechanism. Duplicating them for convenience will make the
> data flow harder to follow.

---

### How a tip landing propagates

1. `TipForm` calls `TipSplitterClient.submit()` and awaits on-chain confirmation.
2. On success, `TipForm` calls `tipEvents.emit(payload)`.
3. `RecentTips` and `Leaderboard` are subscribed via `tipEvents.subscribe()` in
   their own `useEffect`s. They prepend / update their local state immediately.
4. Separately, the backend indexer picks up the `TipReceived` Soroban event
   within ~6 seconds and writes it to the database.
5. The next time the dashboard loads (or the wallet reconnects), components
   re-fetch from the API and reflect the persisted record.

Steps 3 and 5 are independent. The optimistic update in step 3 means the creator
sees the tip immediately; the re-fetch in step 5 is the source of truth.

---

### Worked example — adding a feature that needs shared state

**Scenario:** you want to show a "New tip!" badge in the dashboard sidebar
whenever a tip arrives, without polling.

**Step 1 — subscribe to the existing bus.**
The tip already flows through `tipEvents`. Add a subscriber in the dashboard
layout (or a new hook) — do not create a second bus.

```ts
// src/hooks/useNewTipBadge.ts
import { useEffect, useState } from "react";
import { tipEvents } from "@/lib/tipEvents";

export function useNewTipBadge() {
  const [hasNew, setHasNew] = useState(false);

  useEffect(() => {
    return tipEvents.subscribe(() => setHasNew(true));
  }, []);

  return { hasNew, clear: () => setHasNew(false) };
}
```

**Step 2 — consume the hook where the UI lives.**
Call it in the dashboard layout and pass `hasNew` down to the sidebar nav item.
Clear it when the user visits the page that shows recent tips.

**Step 3 — ask: does this need to outlive the component?**
If the badge should survive a client-side navigation (e.g. the user goes to
Splits and back), lift the `useState` into the dashboard layout where the
sidebar already lives. It does not belong in `WalletContext` because it is
dashboard-local UI state, not identity state.

If it needed to survive a full page reload, you would persist it in
`localStorage` yourself — but that is almost never the right call for a
transient UI indicator.

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