# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- PNG icons (192, 512, maskable 512 and 180 Apple touch) for the web app manifest and iOS home screen
- Next.js 14 App Router frontend for Novatip tipping platform
- Freighter wallet integration via @novatip/sdk for Stellar blockchain
- Creator onboarding flow with slug claiming and split configuration
- Public tip pages at `/slug` URLs with customizable profiles
- Dashboard for creators with earnings overview, transaction history, and analytics
- Webhooks page for registering tip notification endpoints
- Notification preferences for email alerts on tips
- Slug rename functionality for updating creator URLs
- History pagination for transaction listings
- Optimistic tip feed showing pending transactions
- Tip splitter management for configuring collaborator payouts
- QR code generation and share link tools for creators
- WebAuthn-style SIWS (Sign-In With Stellar) authentication
- Real-time transaction status updates and confetti celebration on successful tips
- Dark mode support with system preference detection
- Comprehensive test suite with Vitest and React Testing Library
- GitHub Actions CI pipeline for lint, typecheck, and tests
- Accessibility features including ARIA labels, keyboard navigation, and screen reader support

### Changed
- Send `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy` and `X-Frame-Options` headers on every route via `next.config.mjs`
- Pinned @novatip/sdk to exact commit SHA to prevent stale deployment cache issues
- Configured Vercel builds to use `npm ci` instead of `npm install` for reproducible deployments
- Validated required environment variables at build time to catch configuration errors early

### Fixed
- Badge `usdc` variant now uses `usdc-fg` / `usdc-border` theme tokens instead of raw `blue-300` / `blue-500` palette classes; appearance is unchanged in both themes.
- Restored the avatar and analytics chart implementations, including Unicode initials, UTC dates, and exact earnings totals, after duplicate code broke typechecking.
- Corrected the robots metadata configuration, backend connection context import, and recipient address formatting callback.
- Kept webhook validation outside the Next.js page exports so production builds pass, and normalized encoded @ prefixes in malformed tip links.
- Wallet account mismatch detection to prevent `txBAD_AUTH` errors when Freighter account changes
- USDC trustline validation for split recipients to prevent payment failures
- Theme flash prevention by applying theme before first paint
- Environment variable substitution issues with `NEXT_PUBLIC_` variables in production builds

## [0.1.0] - 2026

### Added
- Initial release

[Unreleased]: https://github.com/Novatip/novatip-web/compare/v0.1.0...HEAD
