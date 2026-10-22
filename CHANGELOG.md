# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Next.js 14 App Router frontend for Novatip tipping platform
- Freighter wallet integration via @novatip/sdk for Stellar blockchain
- Creator onboarding flow with slug claiming and split configuration
- Public tip pages at `/@slug` URLs with customizable profiles
- Dashboard for creators with earnings overview, transaction history, and analytics
- Tip splitter management for configuring collaborator payouts
- QR code generation and share link tools for creators
- WebAuthn-style SIWS (Sign-In With Stellar) authentication
- Real-time transaction status updates and confetti celebration on successful tips
- Dark mode support with system preference detection
- Comprehensive test suite with Vitest and React Testing Library
- GitHub Actions CI pipeline for lint, typecheck, and tests
- Accessibility features including ARIA labels, keyboard navigation, and screen reader support

### Changed
- Pinned @novatip/sdk to exact commit SHA to prevent stale deployment cache issues
- Configured Vercel builds to use `npm ci` instead of `npm install` for reproducible deployments
- Validated required environment variables at build time to catch configuration errors early

### Fixed
- Wallet account mismatch detection to prevent `txBAD_AUTH` errors when Freighter account changes
- USDC trustline validation for split recipients to prevent payment failures
- Theme flash prevention by applying theme before first paint
- Environment variable substitution issues with `NEXT_PUBLIC_` variables in production builds

## [0.1.0] - 2024

### Added
- Initial release

[Unreleased]: https://github.com/Novatip/novatip-web/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/Novatip/novatip-web/releases/tag/v0.1.0
