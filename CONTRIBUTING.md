# Contributing

## Branch and scope

1. Branch from `develop`.
2. Keep each change focused and preserve existing user data behavior.
3. Do not add cloud sync, telemetry, or new credential handling without an explicit product decision and security review.
4. UI changes must preserve RTL/LTR behavior and avoid editor reflow or save-state regressions.

## Validation

Run before opening a pull request:

```bash
npm ci
npm run lint
npm run typecheck
npm test
npm run build
```

For persistence, close, backup, updater, or installer changes, also run the relevant packaged Windows smoke test and document the result in the pull request.

Feature and fix pull requests target `develop`. Promotion to `main` is a separate verified release boundary.
