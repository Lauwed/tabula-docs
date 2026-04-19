# Tabula

**Static, dependency-free API documentation driven by a single JSON file.**

[![npm](https://img.shields.io/npm/v/tabula-docs)](https://www.npmjs.com/package/tabula-docs)
[![license](https://img.shields.io/github/license/Lauwed/tabula-docs)](./LICENSE)
[![CI](https://github.com/Lauwed/tabula-docs/actions/workflows/ci.yml/badge.svg)](https://github.com/Lauwed/tabula-docs/actions)

🔗 **[Live demo](https://lauwed.github.io/tabula-docs/)**

<img width="1710" height="1004" alt="image" src="https://github.com/user-attachments/assets/583c95d1-bc84-4363-b95c-2e36298e8bbe" />

---

> [!NOTE]
> Most of the non-source files in this repository — documentation, CI workflows, CLI scripts, and configuration — were largely generated with the help of [Claude](https://claude.ai). The source files (`src/`) were written by hand and reviewed carefully. That said, if you spot anything insecure or incorrect anywhere in the repo, please don't hesitate to [open an issue](https://github.com/Lauwed/tabula-docs/issues) or submit a PR — all reports are welcome and appreciated.

---

## Why Tabula?

- **Zero runtime dependencies.** Pure HTML + CSS + vanilla JavaScript. No React, no build step, no `node_modules` to serve.
- **One source of truth.** Edit `api.json`, reload — your docs are up to date.
- **Framework agnostic.** PHP, Go, Python, Rust, Node — Tabula doesn't care what's behind your API.
- **Machine-validated.** A built-in linter catches schema errors before they reach the browser.
- **Themeable.** Colors, fonts, logo, dark mode — all from the `settings` block, no CSS editing needed.

---

## Quickstart

```bash
# 1. Scaffold a new docs folder
npx tabula-docs init my-docs

# 2. Edit your API schema
cd my-docs && $EDITOR api.json

# 3. Preview locally
npx tabula-docs serve .
```

Open [http://localhost:3000](http://localhost:3000). Done.

---

## Manual setup

No CLI needed. Copy `src/` into your project, drop your `api.json` next to `index.html`, and serve with any static server.

```
my-docs/
├── index.html
├── script.js
├── styles.css
├── constants.js
├── endpoints.js
├── inputs.js
└── api.json        ← your file
```

---

## Validate your schema

```bash
npx tabula-docs validate path/to/api.json
```

Exit `0` = all clear. Exit `1` = errors to fix before deploying.
See [`docs/validator.md`](docs/validator.md) for the full list of checks.

---

## Examples

| Example                                              | Description                                                  |
| ---------------------------------------------------- | ------------------------------------------------------------ |
| [`examples/minimal/`](examples/minimal/api.json)     | Two tables, ready in 30 seconds                              |
| [`examples/blog/`](examples/blog/api.json)           | Realistic CRUD — posts, users, tags, pagination              |
| [`examples/ecommerce/`](examples/ecommerce/api.json) | Advanced — multipart uploads, order state machine, full auth |

---

## Documentation

| Doc                                                    | Content                                         |
| ------------------------------------------------------ | ----------------------------------------------- |
| [`docs/getting-started.md`](docs/getting-started.md)   | CLI and manual setup walkthrough                |
| [`docs/schema-reference.md`](docs/schema-reference.md) | Complete `api.json` field reference             |
| [`docs/theming.md`](docs/theming.md)                   | Colors, fonts, logo, dark mode                  |
| [`docs/custom-endpoints.md`](docs/custom-endpoints.md) | Non-CRUD endpoints, file uploads                |
| [`docs/validator.md`](docs/validator.md)               | Linter usage and GitHub Actions integration     |
| [`docs/deployment.md`](docs/deployment.md)             | GitHub Pages, Vercel, Netlify, Cloudflare Pages |

---

## Contributing

Contributions are welcome. See [`CONTRIBUTING.md`](CONTRIBUTING.md) for setup instructions, commit conventions, and the PR process.

---

## License

[MIT](./LICENSE) © Lauwed
