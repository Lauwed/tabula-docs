# Contributing

Thank you for considering a contribution to Tabula. This document covers everything you need to get started.

---

## Setup

There is nothing to install. Tabula has no runtime dependencies and no build step.

```bash
git clone https://github.com/Lauwed/tabula-docs.git
cd tabula-docs
```

To preview the UI locally, serve `src/` with any static server:

```bash
cd src && python -m http.server 8080
# or
npx serve src
```

Place an `api.json` next to `index.html` (e.g. copy one from `examples/`) and open [http://localhost:8080](http://localhost:8080).

---

## Running the validator

```bash
node bin/validate-api.mjs examples/minimal/api.json
node bin/validate-api.mjs examples/blog/api.json
node bin/validate-api.mjs examples/ecommerce/api.json
```

All three must exit with code `0` before opening a PR.

---

## Running the tests

```bash
node --test test/
```

Tests use Node's built-in `node:test` module — no test runner to install.

---

## Commit conventions

This project follows [Conventional Commits](https://www.conventionalcommits.org/):

| Prefix      | When to use                          |
| ----------- | ------------------------------------ |
| `feat:`     | New feature or capability            |
| `fix:`      | Bug fix                              |
| `docs:`     | Documentation only                   |
| `chore:`    | Tooling, config, dependencies        |
| `test:`     | Adding or updating tests             |
| `refactor:` | Code change with no behaviour change |

Examples:

```
feat: add --port flag to tabula serve
fix: resolve foreignKey reference with uppercase name
docs: clarify tokenRequired defaults in schema-reference
```

---

## Opening a pull request

1. Fork the repository and create a branch from `main`.
2. Make your changes.
3. Run `node bin/validate-api.mjs examples/*/api.json` — all must pass.
4. Run `node --test test/` — all tests must pass.
5. Open a PR against `main` with a clear description of what and why.

Please keep PRs focused — one concern per PR makes review faster.

> **Note** — The `main` branch is protected. Direct pushes are not allowed.
> All changes must go through a pull request and pass the CI checks before merging.

---

## What we will and won't accept

Tabula is intentionally minimal. Before opening a PR for a new feature, please open an issue first to discuss it.

**Likely accepted:**

- Bug fixes.
- New linter rules that catch real errors.
- New example `api.json` files.
- Documentation improvements.
- Accessibility fixes in `src/`.

**Unlikely accepted:**

- Any runtime dependency added to `src/`.
- A build step or bundler.
- TypeScript in `src/`.
- Features that duplicate OpenAPI/Swagger functionality.

When in doubt, open an issue first.

---

## Code style

All JavaScript is formatted with [Prettier](https://prettier.io/) using the config in `.prettierrc` (tabs, single quotes, 100-char print width). Run it before committing:

```bash
npx prettier --write "src/**/*.{js,css,html}"
```

---

## Repository security

This repository uses the following automated security tooling:

- **Dependabot** — opens weekly PRs to keep `devDependencies` and GitHub Actions up to date. These PRs are labeled `dependencies` and go through the same CI checks as any other PR.
- **CodeQL** — static analysis runs on every push and PR targeting `main`, and on a weekly schedule. Results are visible in the **Security → Code scanning** tab of the repository.

If you discover a security vulnerability, please report it privately via [GitHub Security Advisories](https://github.com/Lauwed/tabula-docs/security/advisories/new) rather than opening a public issue. See [`SECURITY.md`](./SECURITY.md) for the full policy and response timeline.
