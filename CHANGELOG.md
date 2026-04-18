# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.1.0] - 2026-04-18

### Added

- Core UI: `index.html`, `script.js`, `styles.css` rendering an `api.json` file into interactive documentation.
- `constants.js` and `endpoints.js` for schema parsing and endpoint rendering.
- `inputs.js` for form input generation in the try-it panel.
- `bin/validate-api.mjs` — zero-dependency linter for `api.json` files.
- `bin/tabula.mjs` — CLI with `init`, `validate`, and `serve` commands.
- `test/validate.test.mjs` — unit tests using Node's built-in `node:test`.
- `examples/minimal/`, `examples/blog/`, `examples/ecommerce/` — ready-to-use example projects.
- Documentation: `getting-started.md`, `theming.md`, `validator.md`, `custom-endpoints.md`, `deployment.md`.
- GitHub Actions: `ci.yml`, `validate.yml`, `release.yml`.
- `CONTRIBUTING.md` with setup, commit conventions, and PR guidelines.

[Unreleased]: https://github.com/Lauwed/tabula-docs/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/Lauwed/tabula-docs/releases/tag/v0.1.0
