# Validator

Tabula ships a zero-dependency linter (`bin/validate-api.mjs`) that checks your `api.json` for structural and logical errors before the UI ever loads it.

---

## Running locally

```bash
# Validate the default ./api.json
node bin/validate-api.mjs

# Validate a specific file
node bin/validate-api.mjs path/to/api.json
```

Or via the CLI (Phase 3):

```bash
npx tabula-docs validate path/to/api.json
```

**Exit codes**

| Code | Meaning |
| --- | --- |
| `0` | All clear (warnings may still be printed) |
| `1` | One or more errors found — fix before deploying |

---

## What it checks

### Top-level structure

- Valid JSON with a root `tables` array.
- `name.singular` is unique across all tables.

### `defaultErrors`

- Valid HTTP status codes (integers).
- Unique codes — no duplicates.
- Each `response` object has a `code` field matching the parent, and a non-empty `message`.
- `appliesTo` is non-empty and contains only recognized method strings (`GET-list`, `GET-single`, `POST`, `PUT`, `DELETE`).

### `uriParameters`

- Valid `type` values (`"integer"` or `"string"`).
- `defaultValue` is present on every parameter.
- At most one parameter has `"isPrimary": true` per table.
- If `GET-single`, `PUT`, or `DELETE` are active, exactly one primary parameter must be declared.

### `schema` and `response` fields

- Valid type notation (see [Schema object](./schema-reference.md#schema-object)).
- `foreignKey-X` and `array-X` references point to an existing `name.singular`.

### `endpoints` overrides

- Only recognized method keys (`GET-list`, `GET-single`, `POST`, `PUT`, `DELETE`).
- `includedErrors` codes exist in `defaultErrors`.
- Integer shorthands are not allowed inside `endpoints.*.responses` (use `includedErrors` instead).

### `customEndpoints`

- Unique `name` within a table.
- Valid `method` value.
- Numeric response codes.
- Integer shorthands in `responses` reference a code declared in `defaultErrors`.
- Full response objects have a matching `code` field and a non-empty `message`.

### `body`

- Deprecated usage at the table level triggers a warning.
- `defaultValue` is a valid JSON string.
- Multipart fields are complete (`name`, `label`, `type` all present).

### `listParameters` and `queryParameters`

- Valid `type` values.
- `select` parameters have a non-empty `options` array.
- `min` ≤ `max` when both are defined.

### Warnings (non-blocking)

- Empty `{}` or `[]` fields that should be omitted entirely.

---

## GitHub Actions integration

Add this workflow to run the validator on every PR that touches `api.json` or the validator itself:

```yaml
# .github/workflows/validate.yml
name: Validate api.json

on:
  push:
    paths:
      - "examples/**/api.json"
      - "bin/validate-api.mjs"
  pull_request:
    paths:
      - "examples/**/api.json"
      - "bin/validate-api.mjs"

jobs:
  validate:
    name: Validate all example api.json files
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: |
          for f in examples/*/api.json; do
            echo "Validating $f"
            node bin/validate-api.mjs "$f"
          done
```

The job exits with code `1` on any error, blocking the merge. Warnings are printed but do not fail the job.

---

## Extending the validator

`bin/validate-api.mjs` is a single self-contained ES module. Each check is a standalone function — adding a new rule means adding a new function and calling it from the main `validate()` entry point.

The general pattern:

```js
function checkMyNewRule(data, errors, warnings) {
  if (someConditionFails) {
    errors.push("Descriptive error message");
  }
}
```

Contributions are welcome — see [`CONTRIBUTING.md`](../CONTRIBUTING.md).
