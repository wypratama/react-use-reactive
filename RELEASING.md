# Releasing

This package is published to npm from GitHub Actions using **Trusted Publishing** (npm's OIDC integration). Publishing is only supported through the workflow — it intentionally cannot run with a long-lived `NPM_TOKEN`.

## One-time setup

1. The owner's npm account needs two-factor authentication (2FA) enabled.
2. On npmjs.com, open your account → **Access Tokens** → **Trusted Publishing** → *Add trusted account*.
3. Select *GitHub Actions* and provide:
   - **Repository owner**: `wypratama`
   - **Repository name**: `react-use-reactive`
   - **Environment**: leave empty (applies to all) if you want any branch run to be able to publish, or restrict if desired
   - **Workflow name**: `release.yml`

   The Trusted Publisher configuration grants permission to publish *only the `release.yml` workflow* on *only this repository*.

4. No secret token is stored. The `release.yml` workflow already requests `id-token: write`, which lets npm exchange a short-lived OIDC token for a publish token at publish time. Provenance attestations are generated **automatically** — no `--provenance` flag or `publishConfig.provenance` is needed.

## Running a release

1. In GitHub, open **Actions** → **Release** → **Run workflow**.
2. Choose the version bump:
   - `auto` — computed from conventional-commit history
   - `patch` / `minor` / `major` — forced bump
3. The workflow:
   1. Runs the full validation suite (lint, JSDoc type-check, declaration freshness, tests, publint, pack check). If anything fails, the release aborts.
   2. Runs `changelogen` to bump `package.json`/`CHANGELOG.md`, commit, and push the version tag.
   3. Creates the GitHub Release from the changelog.
   4. Runs `npm publish`, which authenticates via Trusted Publishing and attaches the provenance attestation.

## Version policy

The current published version is `1.0.1`. The React peer dependency policy was changed from `>=16` to `^18 || ^19`, which is a **breaking change** for React 16/17 consumers. The next release should therefore be a **major** bump (`2.0.0`).

## Notes

- Releases must be cut from the `default` branch (e.g. `dev`), since the workflow and Trusted Publisher configuration are tied to this repository.
- Trusted Publishing does not support self-hosted runners; the workflow must run on GitHub-hosted `ubuntu-latest`.
- Release runs never use the npm cache (`package-manager-cache: false`) per npm's Trusted Publishing guidance, so registry tokens/cache cannot leak into the publish step.
