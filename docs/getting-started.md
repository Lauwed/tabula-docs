# Getting started

Get a live, interactive API documentation page running in under five minutes — no build step, no dependencies.

---

## Prerequisites

- A static file server, or Node.js ≥ 18 (for the CLI).
- Your `api.json` file. Not sure about the format? Start from [`examples/minimal/api.json`](../examples/minimal/api.json).

---

## Option A — CLI (recommended)

```bash
npx tabula-docs init my-docs
cd my-docs
```

This copies `src/` and a minimal `api.json` into `my-docs/`. Open `index.html` with any static server:

```bash
npx serve .
# or
python -m http.server
```

Then open [http://localhost:3000](http://localhost:3000) (or whichever port your server uses).

---

## Option B — Manual

1. Download or clone this repository.
2. Copy the contents of `src/` into your project folder.
3. Place your `api.json` in the same folder, next to `index.html`.
4. Serve the folder with any static server.

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

## Edit your `api.json`

Open `api.json` and describe your API. The minimal structure looks like this:

```json
{
  "settings": {
    "title": "My API",
    "version": "1.0.0",
    "baseUrl": "/api"
  },
  "tables": [
    {
      "name": { "singular": "user", "plural": "users" },
      "description": "Registered users.",
      "uri": "/users",
      "uriParameters": [
        { "name": "id", "type": "integer", "defaultValue": 1, "isPrimary": true }
      ],
      "schema": { "id": "integer", "name": "string", "email": "string" }
    }
  ]
}
```

Reload the page — the UI updates immediately. No rebuild needed.

---

## Validate before you publish

Run the built-in linter to catch schema errors before they reach the browser:

```bash
node bin/validate-api.mjs path/to/api.json
```

Exit code `0` means all clear. Exit code `1` means there are errors to fix.

See [`docs/validator.md`](./validator.md) for the full list of checks.

---

## Next steps

| Goal | Doc |
| --- | --- |
| Customize colors, logo, dark mode | [`docs/theming.md`](./theming.md) |
| Add non-CRUD endpoints | [`docs/custom-endpoints.md`](./custom-endpoints.md) |
| Deploy to GitHub Pages, Vercel… | [`docs/deployment.md`](./deployment.md) |
| Full schema reference | [`docs/schema-reference.md`](./schema-reference.md) |
