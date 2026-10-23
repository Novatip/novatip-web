# novatip-web

Next.js 14 frontend for Novatip.

## Stack
Next.js 14 App Router, TypeScript 5, Tailwind CSS 3, Freighter via @novatip/sdk, qrcode.react, canvas-confetti, React context.

## Local Development
Prerequisites: Node.js >= 18, novatip-backend on port 3001, Freighter browser extension

    npm install
    cp .env.example .env.local
    npm run dev

App available at http://localhost:3000

## Full-stack local setup

The quick-start above assumes a backend already running at port 3001. This
section covers the full path from a clean checkout to a working tip page —
including PostgreSQL, Redis, a database migration, a deployed contract, and the
SDK build.

### 1. Clone all repositories

The three services are separate repositories. Check them out as siblings in the
same parent directory so the relative path `../novatip-sdk` resolves correctly:

    parent/
    ├── novatip-web/      ← this repo
    ├── novatip-backend/  ← https://github.com/Novatip/novatip-backend
    └── novatip-sdk/      ← https://github.com/Novatip/novatip-sdk

    git clone https://github.com/Novatip/novatip-backend ../novatip-backend
    git clone https://github.com/Novatip/novatip-sdk     ../novatip-sdk

### 2. Start infrastructure services

The backend requires PostgreSQL (for the database) and Redis (for job queues and
session state). The simplest way to run them locally is Docker Compose, but any
running instances work:

    docker run -d --name novatip-pg    -p 5432:5432 -e POSTGRES_PASSWORD=postgres postgres:16
    docker run -d --name novatip-redis -p 6379:6379 redis:7

### 3. Set up and start the backend

    cd ../novatip-backend
    npm install
    cp .env.example .env

Edit `.env` to set `DATABASE_URL` and `REDIS_URL`, then run the database
migration and start the dev server:

    npm run db:migrate   # applies all Prisma migrations
    npm run dev          # starts on http://localhost:3001

See the [novatip-backend README](https://github.com/Novatip/novatip-backend) for
the full list of required environment variables (JWT secret, Stellar RPC URL,
etc.).

### 4. SDK dependency: commit pin and bump workflow

When you install this repo's dependencies with `npm install`, the SDK is
fetched directly from GitHub (see the `@novatip/sdk` entry in `package.json`).
No separate build step is needed for normal frontend work.

#### Why the SDK is pinned to an exact commit

In `package.json`, `@novatip/sdk` is pinned to an exact commit SHA:

```json
"@novatip/sdk": "github:Novatip/novatip-sdk#eeb581655ecc20b7a27ba16705bab62311e491b4"
```

The pin exists because an unpinned specification (such as pointing to a branch or loose tag) allowed a stale copy of the package to survive in deployment caches (e.g. Vercel and CI). This resulted in production builds deploying against an outdated SDK version that no longer matched updated contract interfaces or backend endpoints.

> **Caution:** Do not loosen the dependency spec (e.g. to `github:Novatip/novatip-sdk#main`). Loosening the spec reintroduces the deployment cache bug.

#### Working on the SDK locally

If you want to work on the SDK and see your changes reflected in this app
without publishing a new commit, switch the dependency to the local checkout:

1. Edit `package.json` and change:
   ```json
   "@novatip/sdk": "github:Novatip/novatip-sdk#<commit>"
   ```
   to:
   ```json
   "@novatip/sdk": "file:../novatip-sdk"
   ```
2. Build the SDK:
   ```bash
   cd ../novatip-sdk
   npm install
   npm run build
   ```
3. Re-link in this repo:
   ```bash
   cd ../novatip-web
   npm install
   ```

Revert the `package.json` change before opening a pull request.

#### Bumping the SDK and regenerating the lockfile

When changes to `novatip-sdk` are merged and need to be pulled into this app:

1. Push or merge the changes in `novatip-sdk` and copy the full 40-character commit SHA.
2. Update `package.json` and regenerate `package-lock.json`:
   ```bash
   npm install github:Novatip/novatip-sdk#<commit-sha>
   ```
   or edit `package.json` with the new commit SHA and run `npm install`.
3. **Verify the lockfile uses HTTPS, not SSH:**
   Check `package-lock.json` to confirm that the `resolved` entry for `@novatip/sdk` uses an HTTPS URL:
   ```json
   "resolved": "git+https://github.com/Novatip/novatip-sdk.git#<commit-sha>"
   ```
   The lockfile **must use an https URL, not ssh** (`git+ssh:` or `git@github.com:`). Automated CI environments and deployment platforms (e.g., Vercel) build without SSH keys, and an SSH URL in the lockfile will fail the deployment build.
4. Verify tests and types:
   ```bash
   npm run typecheck
   npm test
   ```

### 5. Deploy the tip_splitter contract

The app cannot process tips without a deployed Soroban contract. Follow the
[novatip-backend deployment guide](https://github.com/Novatip/novatip-backend)
to deploy `tip_splitter` to Testnet and copy the returned contract address.

### 6. Configure and start this app

    cd ../novatip-web
    npm install
    cp .env.example .env.local

Edit `.env.local` and set `NEXT_PUBLIC_TIP_SPLITTER_CONTRACT_ID` to the address
from step 5. The other variables have working defaults for a local Testnet setup.

    npm run dev   # http://localhost:3000

At this point, opening `http://localhost:3000` should show the landing page, and
navigating to `/onboarding` with a Testnet Freighter wallet should complete the
full tip flow.

---

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

### How NEXT_PUBLIC_ variables are read (important for contributors)

`NEXT_PUBLIC_` variables are substituted into the client bundle **at build
time** by Next.js matching the exact literal text `process.env.NEXT_PUBLIC_X`
in source. A computed lookup — `process.env[key]` or
`process.env[\`NEXT_PUBLIC_${name}\`]` — is **never replaced** and evaluates to
`undefined` in the browser.

The failure mode is subtle: the computed lookup works fine in `npm run dev`
(Node has access to the real `process.env`), so a broken read is invisible
locally and only surfaces in production after a deploy.

`src/lib/config.ts` is written to respect this rule: every variable is read as
a direct literal member access (`process.env.NEXT_PUBLIC_FOO`) rather than
through a shared helper that takes a variable name. Do not refactor this into a
loop or a helper function that receives the key as a string argument — every
value will be `undefined` in the browser.

---

## Deployment

The app deploys to [Vercel](https://vercel.com) from this repository.

### Environment variables

Set every variable from the [Environment Variables](#environment-variables)
table above in the Vercel project (**Settings → Environment Variables**), for
each environment you deploy (Production, Preview, Development). Vercel never
reads `.env.local` — that file is local-development-only and is not part of
the deployment.

| Variable | Set it on Vercel? | Why |
|---|---|---|
| `NEXT_PUBLIC_TIP_SPLITTER_CONTRACT_ID` | **Always.** | No default. The build fails without it (see above). |
| `NEXT_PUBLIC_SITE_URL` | **Always.** | Defaults to `http://localhost:3000`, which is wrong for any deployed environment. Set it to the real domain for Production, and to the deployment's own preview URL for Preview deployments — Open Graph images resolve against this. |
| `NEXT_PUBLIC_API_URL` | **Always.** | Defaults to `http://localhost:3001/api/v1`. Set it to the deployed novatip-backend's URL, or every dashboard panel and the public tip page will fail to load data. |
| `NEXT_PUBLIC_STELLAR_NETWORK` | Only to deploy against Mainnet. | Defaults to `testnet`, which is correct for a staging/preview deployment. Production against real funds needs `mainnet`. |
| `NEXT_PUBLIC_USDC_CONTRACT_ID` | Rarely. | The default is the well-known SAC address for both Testnet and Mainnet. Only override for a custom network (e.g. a private Futurenet node). |

### Why `vercel.json` pins the install command

```json
{ "installCommand": "npm ci" }
```

This exists for the same reason `@novatip/sdk` is pinned to an exact commit
(see [Why the SDK is pinned to an exact
commit](#why-the-sdk-is-pinned-to-an-exact-commit) above): an unpinned SDK
spec previously let a stale copy of the package survive in Vercel's build
cache, shipping production against an SDK version that no longer matched the
deployed contract. `npm ci` installs strictly from `package-lock.json` and
**fails** rather than silently re-resolving if the lockfile and
`package.json` disagree. Vercel's zero-config default (`npm install`) does
not give that guarantee — it will happily rewrite the lockfile to make things
line up, which is exactly the drift that let the stale-SDK bug happen. Do not
remove `installCommand` from `vercel.json`; doing so re-opens it.

### Changing a `NEXT_PUBLIC_` variable requires a new deployment

`NEXT_PUBLIC_` variables are baked into the client bundle **at build time**
(see [How NEXT_PUBLIC_ variables are
read](#how-next_public_-variables-are-read-important-for-contributors)
above). Editing one in the Vercel dashboard does not change anything about an
already-built deployment — the live site keeps serving the bundle built with
the old value until a new build runs. After changing a variable, trigger a
redeploy (push a commit, or use **Deployments → Redeploy** in the Vercel
dashboard) — do not expect the change to take effect on its own.

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

### `Freighter is currently on XXXX…XXXX but this action is for YYYY…YYYY`

**Cause:** The Freighter extension has a different account selected than the one
that was connected when the session started. The transaction is built for the
connected address, so a signature from a different key is rejected by the
network as `txBAD_AUTH`. The app detects the mismatch before building the
transaction and surfaces a readable message instead of raw XDR.

**Fix:** Either:
- Switch to the correct account in Freighter (the one shown in the error), **or**
- Click **Disconnect** in the app and reconnect — the new connect flow will pick
  up whichever account is currently active in Freighter.

---

### `XXXX…XXXX cannot receive USDC yet` when saving splits

**Cause:** Every recipient in a split must hold a USDC trustline before the jar
can be saved. The `tip_splitter` contract pays all recipients atomically, so a
single account without a trustline causes the entire tip to fail — and it fails
for the supporter, who did nothing wrong and cannot fix it. The app checks
truslines at save time so the creator can act on it before any supporter is
affected.

The full message is one of:

> `<addr> cannot receive USDC yet. That account needs to add a USDC trustline before it can be paid, otherwise every tip to this jar fails.`

> `These accounts cannot receive USDC yet: <addr1>, <addr2>. Each needs to add a USDC trustline before it can be paid, otherwise every tip to this jar fails.`

**Fix:** Each flagged account must add a USDC trustline. In Freighter:
1. Open Freighter and switch to the flagged account.
2. Go to **Manage Assets** → **Add Asset**.
3. Search for **USDC** and add the Circle-issued token on the correct network
   (Testnet or Mainnet to match `NEXT_PUBLIC_STELLAR_NETWORK`).
4. Once added, retry saving the splits in the dashboard.

A freshly funded Stellar account has no trustlines by default — this step is
required for any new collaborator account before it can appear in a split.

---

## Key Pages

/                   - Home landing page
/[slug]             - Public tip page
/onboarding         - Creator onboarding wizard
/dashboard          - Creator earnings overview
/dashboard/splits   - Collaborator splits manager
/dashboard/qr       - QR code and share link

## Tip page URL shapes

A tip page answers on two URL shapes:

| Shape | Example | Notes |
|---|---|---|
| `/alice` | `https://novatip.xyz/alice` | **Canonical.** Share this link and use it in QR codes. |
| `/@alice` | `https://novatip.xyz/@alice` | Also resolves. Both forms reach the same page. |

**The `@` belongs to the jar ID, not to the URL.** When a creator claims the
slug `alice`, the corresponding on-chain jar is registered as `@alice`. The web
URL is `/alice` (without the `@`). Visiting `/@alice` also works — the page
component strips the leading `@` via `normalizeSlug` before resolving the
creator — but `/alice` is the form the app generates for share links and QR
codes.

**Relationship between slug and jar ID:**

- **Slug** (`alice`) — the identifier stored in the backend database and used in
  all web URLs.
- **Jar ID** (`@alice`) — the on-chain identifier passed to the `tip_splitter`
  contract. Derived from the slug by prepending `@`. See `jarIdForSlug` in
  `src/lib/jar.ts`.

This distinction matters when reading contract state or events: the contract
always uses `@alice`, while the REST API and web routes always use `alice`.

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

## Browser and wallet support

### Supported wallets

| Wallet | Status | Notes |
|---|---|---|
| [Freighter](https://freighter.app) | **Supported** | The only wallet integrated today. Required for connecting, tipping, and creator onboarding. |
| Other Stellar wallets | Not supported | WalletConnect / SEP-07 integration is planned but not yet implemented. |

Freighter is a browser extension. If it is not installed when a visitor presses
**Connect**, the app shows:

> Freighter wallet extension not found. Install it from freighter.app, then reload this page.

### Mobile

Freighter is not available on mobile browsers. A visitor on a phone cannot
connect a wallet, which means:

- **Tipping** requires a desktop browser with the Freighter extension installed.
- **Viewing** a creator's tip page (the `/@slug` route) works on any device —
  the page loads, shows the creator's profile, and displays the tip form, but the
  Connect button will fail if Freighter is absent.

Mobile wallet support (via WalletConnect or a similar deep-link protocol) is on
the roadmap but not currently implemented.

### Tested browsers

The app is developed and tested against the following desktop browsers:

| Browser | Status |
|---|---|
| Chrome / Chromium | Primary development target |
| Firefox | Tested — Freighter supports it |
| Edge (Chromium) | Tested — Freighter supports it |
| Safari | Not tested — Freighter is not available on Safari |
| Brave | Tested — Freighter supports it |

Any browser that supports the Freighter extension and modern ES2020 features
(optional chaining, nullish coalescing, `Promise.allSettled`) is expected to
work. No IE11 or legacy-browser polyfills are included.

---

## Wallet account requirements

Two conditions must be met before a tip or a split save can succeed. Both are
enforced in code and produce clear messages, but they are worth knowing before
you test with fresh accounts.

### The signing account must match the connected account

Freighter signs with whichever account is currently active in the extension.
The transaction is built for the address that was connected at login, so if you
switch accounts in Freighter between connecting and tipping, the network rejects
the submission as `txBAD_AUTH`. The app catches this before submitting and shows:

> `Freighter is currently on XXXX…XXXX but this action is for YYYY…YYYY. Switch accounts in Freighter, or reconnect your wallet to use the active one.`

The guard lives in `src/lib/wallet.ts` (`assertActiveAccount`).

### Every split recipient needs a USDC trustline

On Stellar an account cannot hold an asset it has not explicitly opted in to.
The `tip_splitter` contract pays all split recipients in a single atomic call,
so one collaborator without a USDC trustline fails the whole tip. The app checks
truslines when splits are saved rather than when a tip arrives, so the creator
(not the supporter) sees the error at the moment they can act on it:

> `<addr> cannot receive USDC yet. That account needs to add a USDC trustline before it can be paid, otherwise every tip to this jar fails.`

A freshly created Stellar account has no trustlines. Any new collaborator must
add the USDC asset in Freighter (**Manage Assets → Add Asset**) before being
added to a split. The guard lives in `src/lib/trustline.ts`
(`assertRecipientsCanReceive`).

---

## Wallet Auth (SIWS)

1. Request nonce: POST /auth/challenge
2. Freighter signs the nonce
3. Verify signature: POST /auth/verify
4. JWT stored in localStorage
5. JWT attached to all authenticated API requests

### Session token storage: localStorage and its tradeoffs

The creator session JWT is stored in `localStorage` rather than an `httpOnly` cookie. This section documents why that choice was made and what security costs it carries.

#### Why localStorage

**Cross-origin architecture**

The frontend (`novatip.xyz`) and backend API (`api.novatip.xyz`) are separate origins. An `httpOnly` cookie set by the API cannot be read by JavaScript (which is the security benefit), but it also cannot be sent with `fetch()` requests to the API unless:

1. The API sets `Access-Control-Allow-Credentials: true`, **and**
2. Every fetch includes `credentials: 'include'`, **and**
3. The `Access-Control-Allow-Origin` response header is set to the exact frontend origin (wildcards are forbidden with credentials).

This works, but it makes local development harder (every developer needs matching CORS config) and makes the API harder to use from other clients (mobile apps, CLI tools, third-party integrations). `localStorage` with a bearer token in the `Authorization` header has none of these constraints.

**No server-side rendering for authenticated pages**

The creator dashboard pages are client-side only (`"use client"` directive). There is no server component that needs to read the session to pre-render personalized HTML. If the session lived in an `httpOnly` cookie, the Next.js server still could not read it (the cookie is `httpOnly` precisely so JavaScript cannot), so SSR would not work anyway.

Because the dashboard is always hydrated client-side, there is no SSR benefit to giving up the flexibility of `localStorage`.

**The tip flow does not involve the session**

Sending a tip is an on-chain transaction: the tipper signs it with their wallet and submits it directly to the Stellar network. The backend is not in that path — there is no API call, so there is no session token to protect. The session is only needed for creator-facing features (onboarding, splits, analytics), and those are behind wallet signature verification (SIWS) at sign-in time.

A compromised session token lets an attacker read a creator's dashboard. It does **not** let them:
- Steal funds (tips go to on-chain addresses, not to "whoever holds the session")
- Change splits or claim a new slug (those endpoints re-verify the wallet signature)
- Send tips on someone else's behalf (tips are signed by the sender's wallet, not by a session)

The blast radius is dashboard read access, not write or financial access.

#### Security costs

**Script injection can read the token**

Any script running on the page can call `localStorage.getItem("novatip_jwt")` and exfiltrate the session. This includes:

- A compromised third-party script (analytics, ads, a supply-chain attack on a dependency)
- A stored XSS vulnerability (if user input is ever rendered unescaped — this app does not render user HTML, but the risk is non-zero)
- A browser extension with overly broad permissions

An `httpOnly` cookie would be invisible to all of those, which is why it is the default recommendation for session tokens.

**Mitigations in place:**

1. **Short token expiry**: The JWT expires after a limited time (configured server-side). An exfiltrated token becomes useless once it expires, limiting the window for abuse.

2. **No write operations without wallet re-verification**: Sensitive endpoints (claiming a slug, updating splits) require a fresh wallet signature, not just the session token. A stolen JWT grants read access to the dashboard but cannot change on-chain state or modify the creator's profile.

3. **Server remains the authority**: The token's `exp` claim is checked client-side as a UX optimization (to skip a guaranteed-failing request), but the server validates every token on every request. A manipulated or forged token is rejected immediately.

4. **Minimal third-party scripts**: The app includes no analytics, no ads, and no third-party scripts beyond the essential SDK and wallet libraries. The attack surface for script injection is kept small.

5. **Content Security Policy (future work)**: A strict CSP would block inline scripts and restrict script sources to a known allowlist, further reducing XSS risk. This is not currently implemented but is planned.

**What is not protected:**

- If an attacker gains script execution on the page (via XSS or a compromised dependency), they can read the session token and any other `localStorage` data. This is the inherent cost of client-side storage.

- A session token does not prove wallet ownership at request time — it proves it was owned at sign-in. If a creator's wallet is compromised separately (phishing, leaked seed phrase), the session token does not add protection, but it also does not make things worse (the attacker already has the wallet, which is the real credential).

#### What limits the damage

| Defense | What it prevents |
|---------|-----------------|
| Short token expiry | An exfiltrated token becomes useless after expiry (hours, not days or weeks) |
| Wallet re-verification on writes | Stolen session cannot change splits, claim slugs, or modify on-chain state |
| No financial access via session | Tips are on-chain transactions; session tokens do not control funds |
| Server-side validation on every request | Forged or tampered tokens are rejected immediately |
| Minimal third-party scripts | Reduces the number of scripts that could exfiltrate the token |

#### The alternative: httpOnly cookies

An `httpOnly` cookie would be invisible to scripts, eliminating the XSS exfiltration risk. The costs:

- CORS complexity (see above)
- No SSR benefit (the dashboard is client-only, and the cookie is `httpOnly`)
- Harder to use from non-browser clients (mobile apps, CLI tools)
- CSRF risk (though that can be mitigated with SameSite and CSRF tokens)

The current choice prioritizes flexibility and simplicity over defense-in-depth against XSS. The tradeoff is acceptable because:
1. The session grants only read access to the dashboard, not write or financial access.
2. Write operations require fresh wallet signatures, not just the session.
3. The token expires quickly, limiting the blast radius of a compromised session.

If XSS defense becomes a higher priority (e.g., if the app begins rendering user-generated HTML, or if a security audit recommends it), switching to `httpOnly` cookies is a reversible decision. The backend already supports stateless JWT validation, so no server-side session store is needed — the cookie would carry the JWT just as `localStorage` does today.

## Theming

Light and dark are driven by a `dark` class on `<html>` (Tailwind `darkMode: "class"`).

The theme is applied **before the first paint** by a small blocking inline script in
the `<head>` of `src/app/layout.tsx` — `THEME_INIT_SCRIPT`, defined in `src/lib/theme.ts`.
It reads `localStorage.novatip_theme` and falls back to `prefers-color-scheme`. Because
the server render cannot know the result, `<html>` carries `suppressHydrationWarning`.

Two rules keep it flash-free:

- **Never re-apply the theme after hydration.** The class the script already applied
  is the source of truth for what is painted (`getAppliedTheme()`). `ThemeToggle`
  does read the stored *preference* after hydration so it can distinguish "system"
  from an explicit light/dark choice, but it never re-applies the theme and its first
  render uses the server-safe "system" default so hydration still matches.
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
    npm test               - run tests once (Vitest)
    npm run test:watch     - run tests in watch mode
    npm run test:coverage  - run tests with v8 coverage report

## Testing

The project uses [Vitest](https://vitest.dev) with [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/).

**Running tests**

    npm test                # single run, exits with pass/fail
    npm run test:watch      # watch mode — re-runs on file changes
    npm run test:coverage   # single run with v8 coverage report (text + lcov)

Coverage output goes to `coverage/`. The lcov report (`coverage/lcov.info`) is
consumed by editor plugins and CI coverage services. Requires
`@vitest/coverage-v8` which is listed in `devDependencies`; run `npm install`
before the first coverage run.

**Writing tests**

Place test files next to the source they test: `src/components/Foo.test.tsx` or `src/lib/bar.test.ts`. They are picked up automatically.

Vitest globals (`describe`, `it`, `expect`, `vi`) are available without imports. `@testing-library/jest-dom` matchers (`.toBeInTheDocument()`, `.toBeDisabled()`, etc.) are loaded globally via `src/test/setup.ts`.

If a test depends on `@novatip/sdk`, the stub at `src/test/mocks/novatip-sdk.ts` is resolved automatically. To override specific exports in a single test file, use `vi.mock('@novatip/sdk', ...)`.

**CI**

`npm test` runs as part of the GitHub Actions CI pipeline defined in `.github/workflows/ci.yml`, alongside lint, typecheck, and build steps.

### The SDK test stub

Tests run against a hand-maintained stub of `@novatip/sdk` located at `src/test/mocks/novatip-sdk.ts`. The stub exists because the real SDK depends on Node crypto APIs and Stellar transaction primitives that are difficult to run in a jsdom test environment.

`vitest.config.mts` aliases `@novatip/sdk` to this stub, so every test import of the SDK resolves to the mock rather than the real package. The stub is **not automatically synchronized** with the real SDK — when the SDK's public interface changes, the stub must be updated by hand.

#### What the stub provides

The stub exports the following to match the real SDK's public API:

| Export | Type | Purpose |
|--------|------|---------|
| `usdcToStroops` | function | Converts a USDC string to stroops (`1 USDC = 10_000_000 stroops`) |
| `isValidTipAmount` | function | Validates a tip amount in stroops (`> 0` and `<= 1000 USDC`) |
| `formatUsdc` | function | Formats stroops as a USDC decimal string |
| `shortenAddress` | function | Abbreviates a Stellar address to `GABC…WXYZ` format |
| `validateSplitsBps` | function | Validates that an array of basis points sums to exactly `10_000` |
| `ContractErrorCode` | enum | Error codes mirroring the `tip_splitter` contract's `Error` enum |
| `NovatipContractError` | class | SDK-level error wrapping a contract error code |
| `Split` | interface | `{ to: string; bps: number }` |
| `Jar` | interface | `{ owner: string; splits: Split[] }` |

The stub intentionally omits blockchain interaction classes like `TipSplitterClient` and wallet signing helpers, since those are not unit-testable in isolation. Tests that need those behaviors should use `vi.mock('@novatip/sdk', ...)` to provide test doubles for the specific functions under test.

#### When to update the stub

Update the stub whenever you bump the SDK pin in `package.json` **and** the SDK's public API has changed. Common triggers:

- A new helper function is added to the SDK and production code begins using it
- An existing function's signature changes (new parameter, different return type)
- `ContractErrorCode` gains or loses a variant because the contract's `Error` enum changed
- Type definitions for `Split`, `Jar`, or other interfaces are modified

**The stub does not need to match private SDK internals** — only the exports that production code actually imports.

#### How to update the stub

1. Identify which SDK exports changed by reviewing the commit that bumped the pin.
2. Open `src/test/mocks/novatip-sdk.ts` and add, remove, or update the affected exports.
3. Ensure the stub's behavior matches the real SDK's documented behavior (especially for validation functions like `isValidTipAmount` and `validateSplitsBps`).
4. Run `npm test` to verify that existing tests still pass with the updated stub.
5. If a test fails after updating the stub, the failure indicates either:
   - The stub was changed incorrectly (fix the stub), or
   - The production code depends on old SDK behavior and needs updating (fix the production code)

**Do not introduce behavior that the real SDK does not have.** The stub exists to let tests run, not to add test-only features. If a test needs behavior the SDK does not provide, mock the SDK in that specific test file rather than polluting the shared stub.

#### Example: Adding a new SDK export to the stub

Suppose the SDK adds a new function `parseJarId` that extracts the slug from a jar ID:

```ts
// Real SDK: novatip-sdk/src/jar.ts
export function parseJarId(jarId: string): string | null {
  if (!jarId.startsWith('@')) return null;
  return jarId.slice(1);
}
```

After bumping the SDK pin and seeing production code import `parseJarId`, add it to the stub:

```ts
// src/test/mocks/novatip-sdk.ts
export function parseJarId(jarId: string): string | null {
  if (!jarId.startsWith('@')) return null;
  return jarId.slice(1);
}
```

Then verify the change:

```bash
npm test
```

If tests fail, inspect the failure to determine whether the stub's implementation matches the real SDK's behavior.

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

### Optimistic tip feed and polling windows

The `RecentTips` component (`src/components/RecentTips.tsx`) displays live tips on the creator dashboard. It combines optimistic updates with adaptive polling to balance responsiveness with backend load.

#### How it works

1. **Normal cadence (15s):** In steady state, `RecentTips` polls `analyticsApi.recent()` every 15 seconds (`NORMAL_INTERVAL = 15_000`). Polling automatically pauses when the browser tab is hidden and aborts in-flight requests via `usePolling` / `useAbortableRequest`.
2. **Optimistic prepending on tip success:** When a tip succeeds, `TipForm` emits an event on `tipEvents`. `RecentTips` immediately creates an optimistic entry with `kind: "pending"`, a unique client ID, and an expiration timestamp `expiresAt = Date.now() + 30_000`, prepending it to the list with a "confirming…" status.
3. **Fast polling burst (3s for 30s):** To catch the indexed tip as soon as possible, `RecentTips` temporarily switches its polling interval from 15 seconds to 3 seconds (`FAST_INTERVAL = 3_000`) for a 30-second window (`FAST_WINDOW_MS = 30_000`). Once the window expires, it reverts to the 15-second interval.
4. **Reconciliation and replacement:** When a fresh batch of indexed tips arrives from the API, `mergeWithPending()` reconciles pending entries with indexed records. An entry is confirmed when `isMatch(indexed, pending)` matches both the sender's address AND the amount. Confirmed pending items are removed from state, seamlessly replaced by the persisted indexed record.
5. **Downgrade to unconfirmed:** If the 30-second window elapses without the tip appearing in the indexed response, `mergeWithPending()` downgrades the entry to `kind: "unconfirmed"`, allowing the UI to notify the user rather than leaving a permanent "confirming…" state.

#### Why indexer lag makes this necessary

When a transaction is confirmed on Stellar by Soroban, the client's wallet knows immediately. However:
- The backend indexer must observe the new ledger, extract the `TipReceived` contract event, process splits, and write records to PostgreSQL.
- This indexing cycle introduces an inherent delay of **~5–10 seconds** (typically ~6 seconds).
- Polling at a normal 15-second interval after transaction confirmation would force users to wait anywhere from 6 to 21 seconds to see their tip reflected.
- The optimistic update provides instant visual confirmation, while the 3-second fast polling burst ensures the canonical indexed record replaces the placeholder almost as soon as the indexer commits it to the database.

#### Failure modes to watch for

Contributors modifying `RecentTips`, matching helpers, or event payloads should be vigilant about these potential pitfalls:

- **Duplicate entries ("ghost duplicates"):** If `isMatch()` is too strict (e.g. strict string matching on amounts formatted differently) or if fields don't match, the optimistic entry will never be reconciled with the indexed counterpart. Both the pending item and the indexed record will render simultaneously.
- **Premature clearing of pending tips:** If `isMatch()` matches *only* on sender address without verifying amount (or timestamp), an earlier tip from a returning supporter will falsely match and clear their new pending tip before it actually indexes.
- **Stuck pending rows:** If the backend indexer drops an event, hangs, or experiences an extended lag exceeding 30 seconds, pending items without expiration handling would spin forever. Always preserve the `expiresAt` expiration check and the downgrade to `kind: "unconfirmed"`.
- **In-flight request races on visibility change:** When a tab is backgrounded or brought into focus, un-aborted in-flight requests could resolve out of order. Ensure requests use abort signals so stale polling responses never overwrite newer state.

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

---

### Error taxonomy

Failures across the client arrive in four distinct shapes depending on where in the stack the failure originates. Knowing the error type determines where the error should be handled or translated into user-facing text:

| Source | Error Type / Format | Example | Responsible Module |
|---|---|---|---|
| **Backend API** | `ApiError` class instance | `new ApiError(404, "NOT_FOUND", "Creator not found")` | `src/lib/api.ts` constructs `ApiError` from response payloads (`status`, `code`, `message`). UI components and pages inspect `err.status`/`err.code` or display `err.message`. |
| **Contract (typed)** | `NovatipContractError` from `@novatip/sdk` | `NovatipContractError` with `code: ContractErrorCode.JarNotFound` | `@novatip/sdk` parses contract error codes from simulations. Feature modules such as `src/lib/jar.ts` inspect `err.code` or map contract codes to friendly messages. |
| **Simulation (raw)** | Plain `Error` with simulation diagnostic string | `Error("HostError: Error(Contract, #3)")` | Soroban RPC / Stellar SDK produces raw diagnostic strings when simulation fails without a structured SDK contract error. Modules such as `src/lib/jar.ts` check `err.message` via pattern matching. |
| **Transaction Submission** | Base64-encoded `TransactionResult` XDR | `Error("Transaction submission failed: AAAAAAAA+QT////6AAAAAA==")` | `src/lib/txerror.ts` (`describeSubmissionError`, `decodeResultCode`) decodes the base64 XDR using `@stellar/stellar-sdk` and translates result codes (e.g., `txBadAuth`, `txInsufficientBalance`, `txBadSeq`) into actionable human prose. |

#### Detailed breakdown

1. **Backend `ApiError` (`src/lib/api.ts`)**
   - **When it occurs:** Thrown by `request()` in `src/lib/api.ts` whenever the REST backend returns a non-2xx HTTP status, as well as on network timeouts or aborted requests.
   - **Shape:** `ApiError` instance with properties `status` (number), `code` (string), and `message` (string).
   - **Example:** `throw new ApiError(404, "NOT_FOUND", "Creator not found");`
   - **Handling:** UI components and route handlers (such as `src/app/[slug]/page.tsx`) catch `ApiError` and branch on `error.status` or `error.code` to show specific UI states (like 404 views) or display `error.message`.

2. **Contract `NovatipContractError` (`@novatip/sdk`)**
   - **When it occurs:** Thrown by `@novatip/sdk` methods when a Soroban contract call simulation fails with a known contract error code.
   - **Shape:** An instance of `NovatipContractError` with a typed `code` property (`ContractErrorCode`).
   - **Example:** `new NovatipContractError(ContractErrorCode.JarNotFound)`
   - **Handling:** Catch blocks in feature modules (e.g. `src/lib/jar.ts`) check `err instanceof NovatipContractError` and test `err.code` against `ContractErrorCode` to handle known states (for example, treating `JarNotFound` as `null` during onboarding).

3. **Raw Simulation String**
   - **When it occurs:** Soroban RPC returns simulation diagnostic failures that the SDK could not parse into a typed `NovatipContractError` (e.g., host errors, budget exhaustion, or contract panics).
   - **Shape:** A standard JavaScript `Error` whose `message` contains diagnostic strings like `"HostError: Error(Contract, #3)"`.
   - **Example:** `new Error("Transaction simulation failed: HostError: Error(Contract, #3)")`
   - **Handling:** Catch blocks perform regex or substring matching on `err.message` (e.g. `isJarNotFound` in `src/lib/jar.ts` tests `/Error\(Contract,\s*#3\)/`) to identify the failure when SDK error typing is unavailable.

4. **Transaction Submission Failures (`src/lib/txerror.ts`)**
   - **When it occurs:** The transaction was simulated successfully and signed by the wallet, but the Stellar network rejected it during submission.
   - **Shape:** The SDK surfaces the error as a raw message ending in a base64-encoded `TransactionResult` XDR.
   - **Example:** `Error: Transaction submission failed: AAAAAAAA+QT////6AAAAAA==`
   - **Handling:** Wrap transaction submission promises with `describeSubmissionError()` from `src/lib/txerror.ts` (as in `src/lib/jar.ts`). `lib/txerror.ts` extracts the base64 XDR, decodes the union result code via `xdr.TransactionResult.fromXDR()`, and maps cryptic codes (such as `txBadAuth`, `txBadSeq`, `txInsufficientBalance`) to clear, actionable user messages (e.g. switching Freighter accounts or acquiring XLM).

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