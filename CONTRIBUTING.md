# Contributing to `novatip-web`

Thanks for your interest. The full contribution guide for every Novatip
repository lives in one place:

**[Novatip contributing guide](https://novatip-docs.pages.dev/contributing)**
([source](https://github.com/Novatip/novatip-docs/blob/main/CONTRIBUTING.md))

Read that first. This page only covers what is specific to this repository.

## Quick start

```bash
git clone https://github.com/YOUR_USERNAME/novatip-web
cd novatip-web
git remote add upstream https://github.com/Novatip/novatip-web
git checkout -b fix/short-description
```

This app resolves `@novatip/sdk` from a sibling checkout, so clone and build
it alongside this repo:

```bash
git clone https://github.com/Novatip/novatip-sdk ../novatip-sdk
(cd ../novatip-sdk && npm ci && npm run build)
npm install
cp .env.example .env.local   # NEXT_PUBLIC_TIP_SPLITTER_CONTRACT_ID is required
```

## Accessibility

Before opening a pull request, work through the [accessibility checklist in the README](./README.md#accessibility).
Reviewers will use it as a rubric, so saving it for after review costs more than checking once before.

The short version: every interactive element needs an accessible name, tab
order must follow visual order, focus rings must be visible, colours must meet
WCAG AA contrast, and dynamic changes (loading, errors, confirmations) must be
announced to screen readers.

## Before you push

CI runs exactly these, so run them locally first:

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

## Pull request checklist

Before opening a pull request, check off each of the following:

- [ ] **Lint, typecheck, and tests**: `npm run lint`, `npm run typecheck`, and `npm test` all pass cleanly.
- [ ] **Test alongside bug fixes**: Every bug fix includes a test reproducing the problem and verifying the fix.
- [ ] **Both themes**: UI changes have been checked in both light and dark themes.
- [ ] **Narrow viewport**: UI changes have been verified on a narrow (mobile) viewport.
- [ ] **Design tokens**: Styling uses design tokens rather than raw palette classes.
- [ ] **Changelog entry**: User-visible changes (new features, bug fixes, breaking changes) include an entry in the `Unreleased` section of `CHANGELOG.md`.

## Opening a pull request

- One issue per pull request, opened against `main`
- Reference the issue so it closes on merge: `Closes #123`
- Use [conventional commits](https://novatip-docs.pages.dev/contributing):
  `feat:`, `fix:`, `docs:`, `test:`, `chore:`, `refactor:`

## Keeping your branch up to date

This repository requires branches to be up to date with `main` before merging.
If other pull requests merge after yours is opened, GitHub will block your PR
with a message saying the branch is out of date.

This requirement exists to ensure CI runs against the latest codebase. Without
it, two passing PRs could introduce conflicts or break the build when merged
together, even though each passed CI individually.

### Updating your branch

**One-click update (GitHub UI):**

Click the "Update branch" button on your pull request page. GitHub will merge
the latest `main` into your branch automatically.

**Command line:**

```bash
git checkout your-branch-name
git fetch upstream
git merge upstream/main
git push
```

After updating, CI will run again and must pass before the PR can merge.

## Reporting security issues

Do not open a public issue. See
[SECURITY.md](https://github.com/Novatip/novatip-docs/blob/main/SECURITY.md).
