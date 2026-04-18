#!/usr/bin/env node

/**
 * validate-api.mjs
 * Linter for api.json — no dependencies, pure Node.js
 * Usage: node validate-api.mjs [path/to/api.json] [--verbose|-v]
 */

import { readFileSync } from "fs";
import { resolve } from "path";

// ─── Config ──────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const verbose = args.includes("--verbose") || args.includes("-v");
const filePath = resolve(args.find((a) => !a.startsWith("-")) ?? "api.json");

const VALID_INCLUDED_ENDPOINTS = [
  "GET-list",
  "GET-single",
  "POST",
  "PUT",
  "DELETE",
];
const VALID_METHODS = ["GET", "POST", "PUT", "DELETE"];
const VALID_PARAM_TYPES = ["integer", "string"];
const VALID_QUERY_TYPES = ["integer", "string", "select"];
const VALID_MULTIPART_TYPES = ["string", "file"];
const VALID_TYPE_PRIMITIVES = [
  "string",
  "string?",
  "integer",
  "integer?",
  "boolean",
  "boolean?",
  "timestamp",
  "timestamp?",
  "datetime",
  "datetime?",
  "double",
  "double?",
];
const VALID_DEFAULT_ERROR_APPLIES_TO = [
  "GET-list",
  "GET-single",
  "POST",
  "PUT",
  "DELETE",
];
const VALID_ENDPOINT_OVERRIDE_KEYS = [
  "GET-list",
  "GET-single",
  "POST",
  "PUT",
  "DELETE",
];

// Endpoints that require a primary uriParameter to build the URI
const ENDPOINTS_NEEDING_PRIMARY = ["GET-single", "PUT", "DELETE"];

// ─── Reporter ────────────────────────────────────────────────────────────────

let errors = 0;
let warnings = 0;
let passes = 0;

function error(path, message) {
  console.error(`  ❌  [${path}] ${message}`);
  errors++;
}

function warn(path, message) {
  console.warn(`  ⚠️   [${path}] ${message}`);
  warnings++;
}

function pass(path, message) {
  passes++;
  if (verbose) {
    console.log(`  ✔   [${path}] ${message}`);
  }
}

function section(title) {
  console.log(`\n  ── ${title}`);
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function isValidTypeString(value) {
  if (VALID_TYPE_PRIMITIVES.includes(value)) return true;
  if (/^foreignKey-(.+)$/.test(value)) return true;
  if (/^array-(.+)$/.test(value)) return true;
  // Enum: "A | B | C"
  if (/^[A-Z_]+(\s*\|\s*[A-Z_]+)+$/.test(value)) return true;
  return false;
}

function extractResourceRef(value) {
  const fk = value.match(/^foreignKey-(.+)$/);
  if (fk) return fk[1];
  const arr = value.match(/^array-(.+)$/);
  if (arr) return arr[1];
  return null;
}

function isValidJson(str) {
  try {
    JSON.parse(str);
    return true;
  } catch {
    return false;
  }
}

const VALID_THEME_KEYS = [
  "accent",
  "accentLight",
  "accentDark",
  "colorGet",
  "colorPost",
  "colorPut",
  "colorDelete",
  "fontBody",
  "fontMono",
];

const VALID_DARK_THEME_KEYS = [
  "accent",
  "accentLight",
  "accentDark",
  "colorGet",
  "colorPost",
  "colorPut",
  "colorDelete",
];

// ─── Validators ──────────────────────────────────────────────────────────────

function isHexColor(value) {
  return /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/.test(value);
}

function validateThemeObject(theme, path, allowedKeys) {
  if (typeof theme !== "object" || Array.isArray(theme) || theme === null) {
    error(path, `must be a plain object`);
    return;
  }
  pass(path, `is a plain object`);

  for (const key of Object.keys(theme)) {
    if (!allowedKeys.includes(key)) {
      warn(path, `Unknown theme key "${key}" — valid keys: ${allowedKeys.join(", ")}`);
    }
  }

  const colorKeys = ["accent", "accentLight", "accentDark", "colorGet", "colorPost", "colorPut", "colorDelete"];
  for (const key of colorKeys) {
    if (theme[key] === undefined) continue;
    if (typeof theme[key] !== "string") {
      error(`${path}.${key}`, `must be a string`);
    } else if (!isHexColor(theme[key])) {
      error(`${path}.${key}`, `must be a valid hex color (e.g. "#1d9e75") — got "${theme[key]}"`);
    } else {
      pass(`${path}.${key}`, `valid hex color "${theme[key]}"`);
    }
  }

  for (const key of ["fontBody", "fontMono"]) {
    if (theme[key] === undefined) continue;
    if (typeof theme[key] !== "string" || theme[key] === "") {
      error(`${path}.${key}`, `must be a non-empty string`);
    } else {
      pass(`${path}.${key}`, `valid font "${theme[key]}"`);
    }
  }
}

function validateSettings(settings, path) {
  if (typeof settings !== "object" || Array.isArray(settings) || settings === null) {
    error(path, `"settings" must be a plain object`);
    return;
  }
  pass(path, `is a plain object`);

  if (settings.title !== undefined) {
    if (typeof settings.title !== "string" || settings.title === "") {
      error(path, `"title" must be a non-empty string`);
    } else {
      pass(path, `title = "${settings.title}"`);
    }
  }

  if (settings.description !== undefined) {
    if (typeof settings.description !== "string") {
      error(path, `"description" must be a string`);
    } else {
      pass(path, `description present`);
    }
  }

  if (settings.version !== undefined) {
    if (typeof settings.version !== "string" || settings.version === "") {
      error(path, `"version" must be a non-empty string`);
    } else if (!/^\d+\.\d+\.\d+/.test(settings.version)) {
      warn(path, `"version" should follow semver format (e.g. "1.0.0") — got "${settings.version}"`);
    } else {
      pass(path, `version = "${settings.version}"`);
    }
  }

  if (settings.baseUrl !== undefined) {
    if (typeof settings.baseUrl !== "string" || settings.baseUrl === "") {
      error(path, `"baseUrl" must be a non-empty string`);
    } else if (!settings.baseUrl.startsWith("/") && !/^https?:\/\//.test(settings.baseUrl)) {
      warn(path, `"baseUrl" should start with "/" or "http(s)://" — got "${settings.baseUrl}"`);
    } else {
      pass(path, `baseUrl = "${settings.baseUrl}"`);
    }
  }

  if (settings.logo !== undefined && settings.logo !== null) {
    if (typeof settings.logo !== "string" || settings.logo === "") {
      error(path, `"logo" must be a non-empty string (URL or path)`);
    } else {
      pass(path, `logo present`);
    }
  }

  if (settings.favicon !== undefined && settings.favicon !== null) {
    if (typeof settings.favicon !== "string" || settings.favicon === "") {
      error(path, `"favicon" must be a non-empty string (URL or path)`);
    } else {
      pass(path, `favicon present`);
    }
  }

  if (settings.links !== undefined) {
    if (!Array.isArray(settings.links)) {
      error(path, `"links" must be an array`);
    } else if (settings.links.length === 0) {
      warn(path, `"links" is empty — omit it if unused`);
    } else {
      let linksOk = true;
      settings.links.forEach((link, i) => {
        const lp = `${path}.links[${i}]`;
        if (!link.label || typeof link.label !== "string") {
          error(lp, `Missing or invalid "label"`);
          linksOk = false;
        }
        if (!link.url || typeof link.url !== "string") {
          error(lp, `Missing or invalid "url"`);
          linksOk = false;
        }
        if (link.label && link.url) {
          pass(lp, `link "${link.label}" → "${link.url}"`);
        }
      });
      if (linksOk) pass(path, `all ${settings.links.length} link(s) valid`);
    }
  }

  if (settings.theme !== undefined) {
    validateThemeObject(settings.theme, `${path}.theme`, VALID_THEME_KEYS);
  }

  if (settings.darkTheme !== undefined) {
    validateThemeObject(settings.darkTheme, `${path}.darkTheme`, VALID_DARK_THEME_KEYS);
  }
}

function validateUriParameters(params, path, { needsPrimary = false } = {}) {
  if (!Array.isArray(params)) {
    error(path, `uriParameters must be an array`);
    return;
  }

  const hasPrimary = params.some((p) => p.isPrimary === true);
  const primaryCount = params.filter((p) => p.isPrimary === true).length;

  if (needsPrimary && !hasPrimary) {
    error(
      path,
      `This table includes GET-single, PUT or DELETE but no uriParameter has "isPrimary": true`,
    );
  } else if (needsPrimary && hasPrimary) {
    pass(path, `primary uriParameter present`);
  }

  if (primaryCount > 1) {
    error(
      path,
      `Only one uriParameter can have "isPrimary": true — found ${primaryCount}`,
    );
  }

  params.forEach((param, i) => {
    const p = `${path}.uriParameters[${i}]`;

    if (!param.name || typeof param.name !== "string") {
      error(p, `Missing or invalid "name"`);
    } else {
      pass(p, `name = "${param.name}"`);
    }

    if (!VALID_PARAM_TYPES.includes(param.type)) {
      error(
        p,
        `"type" must be one of: ${VALID_PARAM_TYPES.join(", ")} — got "${param.type}"`,
      );
    } else {
      pass(p, `type = "${param.type}"`);
    }

    if (param.defaultValue === undefined || param.defaultValue === null) {
      error(p, `Missing "defaultValue"`);
    } else {
      pass(p, `defaultValue present`);
    }
  });
}

function validateSchemaObject(schema, path, knownTableNames) {
  if (typeof schema !== "object" || Array.isArray(schema) || schema === null) {
    error(path, `Schema must be a plain object`);
    return;
  }

  const fields = Object.entries(schema);
  let allOk = true;

  for (const [key, value] of fields) {
    const p = `${path}.${key}`;

    if (typeof value !== "string") {
      error(p, `Type value must be a string — got ${typeof value}`);
      allOk = false;
      continue;
    }

    if (!isValidTypeString(value)) {
      error(p, `Unknown type notation "${value}"`);
      allOk = false;
      continue;
    }

    const ref = extractResourceRef(value);
    if (ref && !knownTableNames.has(ref)) {
      error(p, `Reference "${value}" points to unknown table "${ref}"`);
      allOk = false;
    } else {
      pass(p, `"${key}": "${value}"`);
    }
  }

  if (allOk && fields.length > 0) {
    pass(path, `all ${fields.length} field(s) valid`);
  }
}

function validateQueryParameters(params, path) {
  if (!Array.isArray(params)) {
    error(path, `queryParameters must be an array`);
    return;
  }

  params.forEach((param, i) => {
    const p = `${path}[${i}]`;

    if (!param.name || typeof param.name !== "string") {
      error(p, `Missing or invalid "name"`);
    } else {
      pass(p, `name = "${param.name}"`);
    }

    if (!param.label || typeof param.label !== "string") {
      error(p, `Missing or invalid "label"`);
    } else {
      pass(p, `label = "${param.label}"`);
    }

    if (!VALID_QUERY_TYPES.includes(param.type)) {
      error(
        p,
        `"type" must be one of: ${VALID_QUERY_TYPES.join(", ")} — got "${param.type}"`,
      );
    } else {
      pass(p, `type = "${param.type}"`);
    }

    if (param.type === "select") {
      if (!Array.isArray(param.options) || param.options.length === 0) {
        error(p, `"select" type requires a non-empty "options" array`);
      } else {
        let optionsOk = true;
        param.options.forEach((opt, j) => {
          if (!opt.name) { error(`${p}.options[${j}]`, `Missing "name"`); optionsOk = false; }
          if (!opt.label) { error(`${p}.options[${j}]`, `Missing "label"`); optionsOk = false; }
          if (opt.name && opt.label) pass(`${p}.options[${j}]`, `option "${opt.label}"`);
        });
        if (optionsOk) pass(p, `all ${param.options.length} option(s) valid`);
      }
    }

    if (
      param.min !== undefined &&
      param.max !== undefined &&
      param.min > param.max
    ) {
      error(
        p,
        `"min" (${param.min}) cannot be greater than "max" (${param.max})`,
      );
    } else if (param.min !== undefined && param.max !== undefined) {
      pass(p, `min/max range [${param.min}, ${param.max}] valid`);
    }
  });
}

function validateBodyObject(body, path, knownTableNames) {
  if (typeof body !== "object" || Array.isArray(body) || body === null) {
    error(path, `body must be a plain object`);
    return;
  }
  pass(path, `body is a plain object`);

  if (body.multipart === true) {
    if (!Array.isArray(body.fields) || body.fields.length === 0) {
      error(path, `Multipart body requires a non-empty "fields" array`);
    } else {
      body.fields.forEach((field, i) => {
        const fp = `${path}.fields[${i}]`;
        if (!field.name) error(fp, `Missing "name"`);
        else pass(fp, `name = "${field.name}"`);

        if (!field.label) error(fp, `Missing "label"`);
        else pass(fp, `label = "${field.label}"`);

        if (!VALID_MULTIPART_TYPES.includes(field.type)) {
          error(
            fp,
            `"type" must be one of: ${VALID_MULTIPART_TYPES.join(", ")} — got "${field.type}"`,
          );
        } else {
          pass(fp, `type = "${field.type}"`);
        }

        if (field.type === "file") {
          if (!Array.isArray(field.accept) || field.accept.length === 0) {
            error(fp, `File field requires a non-empty "accept" array`);
          } else {
            let acceptOk = true;
            field.accept.forEach((v, j) => {
              if (typeof v !== "string" || v === "") {
                error(`${fp}.accept[${j}]`, `Each "accept" entry must be a non-empty string`);
                acceptOk = false;
              }
            });
            if (acceptOk) pass(fp, `accept = [${field.accept.join(", ")}]`);
          }
          if (field.maxWeight === undefined || field.maxWeight === null) {
            error(fp, `File field requires a "maxWeight" number`);
          } else if (typeof field.maxWeight !== "number" || field.maxWeight <= 0) {
            error(fp, `"maxWeight" must be a positive number — got "${field.maxWeight}"`);
          } else {
            pass(fp, `maxWeight = ${field.maxWeight}`);
          }
        }
      });
    }
  } else {
    if (body.schema) {
      validateSchemaObject(body.schema, `${path}.schema`, knownTableNames);
    }
    if (body.defaultValue !== undefined) {
      if (typeof body.defaultValue !== "string") {
        error(path, `"defaultValue" must be a JSON string`);
      } else if (!isValidJson(body.defaultValue)) {
        error(path, `"defaultValue" is not valid JSON`);
      } else {
        pass(path, `defaultValue is valid JSON`);
      }
    }
  }
}

/**
 * Validates the legacy top-level body object ({ post, put }).
 * Still supported for backwards compatibility but will emit a warning.
 */
function validateLegacyBody(body, path, knownTableNames) {
  if (typeof body !== "object" || Array.isArray(body) || body === null) {
    error(path, `body must be a plain object`);
    return;
  }

  if (Object.keys(body).length === 0) {
    warn(path, `"body" is an empty object — omit it if the table has no body`);
    return;
  }

  warn(
    path,
    `Top-level "body" is deprecated — use "endpoints.POST.body" / "endpoints.PUT.body" instead`,
  );

  const allowedKeys = ["post", "put"];
  for (const key of Object.keys(body)) {
    if (!allowedKeys.includes(key)) {
      warn(path, `Unexpected key "${key}" in body — expected "post" or "put"`);
    }
  }

  for (const method of allowedKeys) {
    if (!body[method]) continue;
    validateBodyObject(body[method], `${path}.${method}`, knownTableNames);
  }
}

/**
 * Validates a responses array that may contain either full response objects
 * or plain integer references to defaultErrors codes.
 *
 * A plain integer (e.g. 500) is a shorthand that references the matching
 * entry in the root defaultErrors array. The validator checks that the
 * referenced code actually exists in knownDefaultErrorCodes.
 */
function validateResponsesArray(responses, path, knownDefaultErrorCodes) {
  if (!Array.isArray(responses)) {
    error(path, `"responses" must be an array`);
    return;
  }

  responses.forEach((r, j) => {
    const rp = `${path}[${j}]`;

    // ── Shorthand: plain integer reference to a defaultError ──────────
    if (typeof r === "number") {
      if (!Number.isInteger(r)) {
        error(rp, `Shorthand error reference must be an integer — got ${r}`);
        return;
      }
      if (knownDefaultErrorCodes && !knownDefaultErrorCodes.has(r)) {
        error(
          rp,
          `Shorthand error reference ${r} is not declared in "defaultErrors"`,
        );
      } else {
        pass(rp, `shorthand reference → ${r}`);
      }
      return;
    }

    // ── Full response object ───────────────────────────────────────────
    if (typeof r !== "object" || Array.isArray(r) || r === null) {
      error(
        rp,
        `Response entry must be an object or an integer shorthand — got ${typeof r}`,
      );
      return;
    }

    if (typeof r.code !== "number") {
      error(rp, `Missing or invalid "code" (must be a number)`);
      return;
    }

    if (r.code >= 400) {
      if (
        typeof r.response !== "object" ||
        Array.isArray(r.response) ||
        r.response === null
      ) {
        error(
          rp,
          `Error response (${r.code}) must be an object — got ${typeof r.response}`,
        );
      } else {
        if (r.response.code !== r.code) {
          error(
            rp,
            `"response.code" (${r.response.code}) must match the outer "code" (${r.code})`,
          );
        }
        if (
          typeof r.response.message !== "string" ||
          r.response.message === ""
        ) {
          error(rp, `Error response must have a non-empty "message" string`);
        } else {
          pass(rp, `error response ${r.code} — "${r.response.message}"`);
        }
      }
    } else {
      pass(rp, `response ${r.code} valid`);
    }
  });
}

/**
 * Validates the defaultErrors array at the root level.
 * Returns the Set of declared error codes for downstream cross-reference.
 */
function validateDefaultErrors(defaultErrors, path) {
  if (!Array.isArray(defaultErrors)) {
    error(path, `"defaultErrors" must be an array`);
    return new Set();
  }

  if (defaultErrors.length === 0) {
    warn(path, `"defaultErrors" is empty — omit it if unused`);
    return new Set();
  }

  const seenCodes = new Set();

  defaultErrors.forEach((entry, i) => {
    const p = `${path}[${i}]`;

    // code
    if (typeof entry.code !== "number") {
      error(p, `Missing or invalid "code" (must be a number)`);
    } else {
      if (seenCodes.has(entry.code)) {
        error(p, `Duplicate defaultError code ${entry.code}`);
      } else {
        pass(p, `code = ${entry.code}`);
      }
      seenCodes.add(entry.code);
    }

    // response
    if (
      typeof entry.response !== "object" ||
      Array.isArray(entry.response) ||
      entry.response === null
    ) {
      error(p, `"response" must be a plain object`);
    } else {
      if (entry.response.code !== entry.code) {
        error(
          p,
          `"response.code" (${entry.response.code}) must match the outer "code" (${entry.code})`,
        );
      }
      if (
        typeof entry.response.message !== "string" ||
        entry.response.message === ""
      ) {
        error(p, `"response.message" must be a non-empty string`);
      } else {
        pass(p, `response ${entry.code} — "${entry.response.message}"`);
      }
    }

    // appliesTo
    if (!Array.isArray(entry.appliesTo) || entry.appliesTo.length === 0) {
      error(p, `"appliesTo" must be a non-empty array`);
    } else {
      let appliesToOk = true;
      entry.appliesTo.forEach((method, j) => {
        if (!VALID_DEFAULT_ERROR_APPLIES_TO.includes(method)) {
          error(
            `${p}.appliesTo[${j}]`,
            `Unknown method "${method}" — valid values: ${VALID_DEFAULT_ERROR_APPLIES_TO.join(", ")}`,
          );
          appliesToOk = false;
        }
      });
      if (appliesToOk) pass(p, `appliesTo = [${entry.appliesTo.join(", ")}]`);
    }
  });

  return seenCodes;
}

/**
 * Validates the endpoints override object on a table.
 * knownDefaultErrorCodes is the Set of codes declared in defaultErrors.
 */
function validateEndpointsOverride(
  endpoints,
  path,
  knownTableNames,
  knownDefaultErrorCodes,
) {
  if (
    typeof endpoints !== "object" ||
    Array.isArray(endpoints) ||
    endpoints === null
  ) {
    error(path, `"endpoints" must be a plain object`);
    return;
  }

  if (Object.keys(endpoints).length === 0) {
    warn(path, `"endpoints" is an empty object — omit it if unused`);
    return;
  }

  for (const key of Object.keys(endpoints)) {
    if (!VALID_ENDPOINT_OVERRIDE_KEYS.includes(key)) {
      error(
        path,
        `Unknown endpoint key "${key}" — valid values: ${VALID_ENDPOINT_OVERRIDE_KEYS.join(", ")}`,
      );
    }
  }

  for (const method of VALID_ENDPOINT_OVERRIDE_KEYS) {
    const override = endpoints[method];
    if (!override) continue;

    const p = `${path}.${method}`;

    if (
      typeof override !== "object" ||
      Array.isArray(override) ||
      override === null
    ) {
      error(p, `Endpoint override must be a plain object`);
      continue;
    }
    pass(p, `override is a plain object`);

    // description (optional but recommended)
    if (override.description !== undefined) {
      if (
        typeof override.description !== "string" ||
        override.description === ""
      ) {
        error(p, `"description" must be a non-empty string`);
      } else {
        pass(p, `description present`);
      }
    }

    // body (only meaningful for POST and PUT)
    if (override.body !== undefined) {
      if (
        method === "GET-list" ||
        method === "GET-single" ||
        method === "DELETE"
      ) {
        warn(p, `"body" is unusual for a ${method} endpoint`);
      }
      validateBodyObject(override.body, `${p}.body`, knownTableNames);
    }

    // includedErrors: must reference known defaultErrors codes
    if (override.includedErrors !== undefined) {
      if (!Array.isArray(override.includedErrors)) {
        error(p, `"includedErrors" must be an array`);
      } else {
        if (override.includedErrors.length === 0) {
          warn(
            p,
            `"includedErrors" is empty — all default errors will be suppressed for this endpoint`,
          );
        }
        let includedOk = true;
        override.includedErrors.forEach((code, j) => {
          if (typeof code !== "number") {
            error(
              `${p}.includedErrors[${j}]`,
              `Error code must be a number — got "${code}"`,
            );
            includedOk = false;
            return;
          }
          if (knownDefaultErrorCodes && !knownDefaultErrorCodes.has(code)) {
            error(
              `${p}.includedErrors[${j}]`,
              `Code ${code} is not declared in "defaultErrors"`,
            );
            includedOk = false;
          }
        });
        if (includedOk && override.includedErrors.length > 0) {
          pass(p, `includedErrors = [${override.includedErrors.join(", ")}]`);
        }
      }
    }

    // responses: additional responses specific to this endpoint
    // Shorthand integer references are NOT allowed here (only in customEndpoints)
    // because endpoint overrides are for standard endpoints which already inherit defaults
    if (override.responses !== undefined) {
      if (!Array.isArray(override.responses)) {
        error(p, `"responses" must be an array`);
      } else {
        let responsesOk = true;
        override.responses.forEach((r, j) => {
          const rp = `${p}.responses[${j}]`;
          if (typeof r === "number") {
            error(
              rp,
              `Shorthand error references are not allowed in "endpoints" overrides — use "includedErrors" instead`,
            );
            responsesOk = false;
            return;
          }
          if (typeof r !== "object" || Array.isArray(r) || r === null) {
            error(rp, `Response entry must be an object — got ${typeof r}`);
            responsesOk = false;
            return;
          }
          if (typeof r.code !== "number") {
            error(rp, `Missing or invalid "code" (must be a number)`);
            responsesOk = false;
            return;
          }
          if (r.code >= 400) {
            if (
              typeof r.response !== "object" ||
              Array.isArray(r.response) ||
              r.response === null
            ) {
              error(
                rp,
                `Error response (${r.code}) must be an object — got ${typeof r.response}`,
              );
              responsesOk = false;
            } else {
              if (r.response.code !== r.code) {
                error(
                  rp,
                  `"response.code" (${r.response.code}) must match the outer "code" (${r.code})`,
                );
                responsesOk = false;
              }
              if (
                typeof r.response.message !== "string" ||
                r.response.message === ""
              ) {
                error(
                  rp,
                  `Error response must have a non-empty "message" string`,
                );
                responsesOk = false;
              } else {
                pass(rp, `error response ${r.code} — "${r.response.message}"`);
              }
            }
          } else {
            pass(rp, `response ${r.code} valid`);
          }
        });
        if (responsesOk && override.responses.length > 0) {
          pass(p, `all ${override.responses.length} response(s) valid`);
        }
      }
    }
  }
}

function validateCustomEndpoints(
  endpoints,
  path,
  knownTableNames,
  knownDefaultErrorCodes,
) {
  if (!Array.isArray(endpoints)) {
    error(path, `customEndpoints must be an array`);
    return;
  }

  const names = endpoints.map((e) => e.name).filter(Boolean);
  const duplicateNames = names.filter((n, i) => names.indexOf(n) !== i);

  if (duplicateNames.length > 0) {
    error(
      path,
      `Duplicate customEndpoint names: ${[...new Set(duplicateNames)].join(", ")}`,
    );
  } else if (names.length > 0) {
    pass(path, `no duplicate names`);
  }

  endpoints.forEach((endpoint, i) => {
    const p = `${path}[${i}] ("${endpoint.name ?? "unnamed"}")`;

    if (!endpoint.name || typeof endpoint.name !== "string") {
      error(p, `Missing or invalid "name"`);
    } else {
      pass(p, `name = "${endpoint.name}"`);
    }

    if (
      endpoint.uri === undefined ||
      endpoint.uri === null ||
      typeof endpoint.uri !== "string"
    ) {
      error(p, `Missing or invalid "uri"`);
    } else {
      pass(p, `uri = "${endpoint.uri}"`);
    }

    if (!VALID_METHODS.includes(endpoint.method)) {
      error(
        p,
        `"method" must be one of: ${VALID_METHODS.join(", ")} — got "${endpoint.method}"`,
      );
    } else {
      pass(p, `method = ${endpoint.method}`);
    }

    if (endpoint.responses !== undefined) {
      // Pass knownDefaultErrorCodes so shorthand integer references can be validated
      validateResponsesArray(
        endpoint.responses,
        `${p}.responses`,
        knownDefaultErrorCodes,
      );
    }

    if (endpoint.queryParameters) {
      validateQueryParameters(endpoint.queryParameters, `${p}.queryParameters`);
    }
    if (endpoint.uriParameters) {
      validateUriParameters(endpoint.uriParameters, p);
    }
    if (endpoint.body !== undefined) {
      if (typeof endpoint.body !== "object" || Array.isArray(endpoint.body)) {
        error(p, `"body" must be a plain object`);
      } else {
        pass(p, `body is a plain object`);
      }
    }
  });
}

function validateTable(table, index, knownTableNames, knownDefaultErrorCodes) {
  const label = table?.name?.singular ?? `tables[${index}]`;
  const path = `tables[${index}] ("${label}")`;

  section(`Table: ${label}`);

  // name
  if (!table.name?.singular || !table.name?.plural) {
    error(path, `"name" must have "singular" and "plural" fields`);
  } else {
    pass(path, `name: "${table.name.singular}" / "${table.name.plural}"`);
  }

  // description (required)
  if (!table.description || typeof table.description !== "string") {
    error(path, `Missing or invalid "description" (required)`);
  } else {
    pass(path, `description present`);
  }

  // uri
  if (!table.uri || typeof table.uri !== "string") {
    error(path, `Missing or invalid "uri"`);
  } else {
    pass(path, `uri = "${table.uri}"`);
  }

  // includedEndpoints
  const included = table.includedEndpoints;
  if (included !== undefined) {
    if (!Array.isArray(included)) {
      error(path, `"includedEndpoints" must be an array`);
    } else {
      let includedOk = true;
      included.forEach((ep) => {
        if (!VALID_INCLUDED_ENDPOINTS.includes(ep)) {
          error(
            path,
            `Unknown includedEndpoint "${ep}" — valid values: ${VALID_INCLUDED_ENDPOINTS.join(", ")}`,
          );
          includedOk = false;
        }
      });
      if (includedOk) pass(path, `includedEndpoints = [${included.join(", ")}]`);
    }
  } else {
    pass(path, `includedEndpoints: all endpoints (default)`);
  }

  // uriParameters + primary key coherence
  const activeEndpoints = included ?? VALID_INCLUDED_ENDPOINTS;
  const needsPrimary = ENDPOINTS_NEEDING_PRIMARY.some((ep) =>
    activeEndpoints.includes(ep),
  );

  if (table.uriParameters !== undefined) {
    validateUriParameters(table.uriParameters, path, { needsPrimary });
  } else if (needsPrimary) {
    error(
      path,
      `This table includes GET-single, PUT or DELETE but "uriParameters" is missing`,
    );
  }

  // schema
  if (table.schema !== undefined) {
    if (Object.keys(table.schema).length === 0) {
      warn(
        path,
        `"schema" is an empty object — omit it if the table has no schema`,
      );
    } else {
      validateSchemaObject(table.schema, `${path}.schema`, knownTableNames);
    }
  }

  // response overrides
  if (table.response !== undefined) {
    const allowedResponseKeys = ["get-single", "get-list"];
    for (const key of Object.keys(table.response)) {
      if (!allowedResponseKeys.includes(key)) {
        warn(
          `${path}.response`,
          `Unexpected key "${key}" — expected "get-single" or "get-list"`,
        );
      } else {
        validateSchemaObject(
          table.response[key],
          `${path}.response.${key}`,
          knownTableNames,
        );
      }
    }
  }

  // endpoints override
  if (table.endpoints !== undefined) {
    validateEndpointsOverride(
      table.endpoints,
      `${path}.endpoints`,
      knownTableNames,
      knownDefaultErrorCodes,
    );

    // Warn if endpoints keys reference methods not in includedEndpoints
    if (Array.isArray(included)) {
      for (const method of Object.keys(table.endpoints)) {
        if (!included.includes(method)) {
          warn(
            `${path}.endpoints.${method}`,
            `Endpoint override declared for "${method}" but it is not in "includedEndpoints"`,
          );
        }
      }
    }
  }

  // body (legacy — deprecated)
  if (table.body !== undefined) {
    validateLegacyBody(table.body, `${path}.body`, knownTableNames);
  }

  // listParameters
  if (table.listParameters !== undefined) {
    validateQueryParameters(table.listParameters, `${path}.listParameters`);
  }

  // customEndpoints
  if (table.customEndpoints !== undefined) {
    validateCustomEndpoints(
      table.customEndpoints,
      `${path}.customEndpoints`,
      knownTableNames,
      knownDefaultErrorCodes,
    );
  }

  // tokenRequired
  if (table.tokenRequired !== undefined) {
    const validTokenKeys = ["post", "put", "delete"];
    let tokenOk = true;
    for (const key of Object.keys(table.tokenRequired)) {
      if (!validTokenKeys.includes(key)) {
        warn(
          `${path}.tokenRequired`,
          `Unexpected key "${key}" — expected "post", "put" or "delete"`,
        );
        tokenOk = false;
      }
      if (typeof table.tokenRequired[key] !== "boolean") {
        error(`${path}.tokenRequired.${key}`, `Value must be a boolean`);
        tokenOk = false;
      } else {
        pass(`${path}.tokenRequired.${key}`, `${key} = ${table.tokenRequired[key]}`);
      }
    }
    if (tokenOk) pass(path, `tokenRequired valid`);
  }
}

// ─── Main ────────────────────────────────────────────────────────────────────

console.log(`\nValidating ${filePath}${verbose ? " (verbose)" : ""}\n`);

let raw;
try {
  raw = readFileSync(filePath, "utf-8");
} catch {
  console.error(`Cannot read file: ${filePath}`);
  process.exit(1);
}

let json;
try {
  json = JSON.parse(raw);
} catch (e) {
  console.error(`Invalid JSON: ${e.message}`);
  process.exit(1);
}
pass("root", `valid JSON`);

if (!json.tables || !Array.isArray(json.tables)) {
  console.error(`  ❌  Root "tables" key is missing or not an array`);
  process.exit(1);
}
pass("root", `"tables" is an array (${json.tables.length} table(s))`);

// Validate settings
if (json.settings !== undefined) {
  section("Settings");
  validateSettings(json.settings, "settings");
}

// Validate defaultErrors and collect known codes for cross-reference
let knownDefaultErrorCodes = new Set();
if (json.defaultErrors !== undefined) {
  section("Default Errors");
  knownDefaultErrorCodes = validateDefaultErrors(
    json.defaultErrors,
    "defaultErrors",
  );
}

// Build the set of known table names for cross-reference validation
const knownTableNames = new Set(
  json.tables.map((t) => t?.name?.singular).filter(Boolean),
);

// Check for duplicate singular names across all tables
const allSingulars = json.tables.map((t) => t?.name?.singular).filter(Boolean);
const duplicates = allSingulars.filter((n, i) => allSingulars.indexOf(n) !== i);
if (duplicates.length > 0) {
  error(
    "tables",
    `Duplicate table name.singular: ${[...new Set(duplicates)].join(", ")}`,
  );
} else {
  pass("tables", `no duplicate table names`);
}

// Validate each table
json.tables.forEach((table, i) => {
  validateTable(table, i, knownTableNames, knownDefaultErrorCodes);
});

// ─── Summary ─────────────────────────────────────────────────────────────────

console.log("");
console.log("─".repeat(60));
if (errors === 0 && warnings === 0) {
  console.log(`  ✅  All checks passed  (${passes} passed)\n`);
  process.exit(0);
} else {
  console.log(`  ${passes} passed  |  ${warnings} warning(s)  |  ${errors} error(s)`);
  if (errors > 0) console.error(`\n  ❌  Validation failed\n`);
  else console.warn(`\n  ⚠️   Validation passed with warnings\n`);
  process.exit(errors > 0 ? 1 : 0);
}
