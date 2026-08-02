/**
 * endpoints.js unit tests — pure logic extracted from the browser module.
 * The functions are re-implemented here from their source rather than imported
 * directly, because endpoints.js targets a browser global scope (no exports).
 * Run: node --test test/endpoints.test.mjs
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

// ─── Pure helpers copied verbatim from endpoints.js ───────────────────────────
// (These functions have no DOM or global dependencies.)

const resolveDefaultErrors = (allDefaultErrors, method, includedErrors) => {
	if (!allDefaultErrors || allDefaultErrors.length === 0) return [];
	let applicable = allDefaultErrors.filter((e) => e.appliesTo.includes(method));
	if (includedErrors !== undefined) {
		applicable = applicable.filter((e) => includedErrors.includes(e.code));
	}
	return applicable.map((e) => ({ code: e.code, response: e.response }));
};

const resolveResponses = (responses, allDefaultErrors) => {
	if (!responses) return [];
	return responses
		.map((r) => {
			if (typeof r === 'number') {
				const found = allDefaultErrors?.find((e) => e.code === r);
				return found ? { code: found.code, response: found.response } : null;
			}
			return r;
		})
		.filter(Boolean);
};

// ─── Test fixtures ────────────────────────────────────────────────────────────

const DEFAULT_ERRORS = [
	{
		code: 401,
		response: { code: 401, message: 'Unauthorized' },
		appliesTo: ['GET-list', 'GET-single', 'POST', 'PUT', 'DELETE'],
	},
	{
		code: 404,
		response: { code: 404, message: 'Not Found' },
		appliesTo: ['GET-single', 'PUT', 'DELETE'],
	},
	{
		code: 500,
		response: { code: 500, message: 'Server Error' },
		appliesTo: ['POST'],
	},
];

// ─── resolveDefaultErrors ─────────────────────────────────────────────────────

describe('resolveDefaultErrors', () => {
	it('returns [] when allDefaultErrors is empty', () => {
		assert.deepEqual(resolveDefaultErrors([], 'GET-list', undefined), []);
	});

	it('returns [] when allDefaultErrors is null/undefined', () => {
		assert.deepEqual(resolveDefaultErrors(null, 'GET-list', undefined), []);
		assert.deepEqual(resolveDefaultErrors(undefined, 'GET-list', undefined), []);
	});

	it('filters by method', () => {
		const result = resolveDefaultErrors(DEFAULT_ERRORS, 'POST', undefined);
		const codes = result.map((r) => r.code);
		assert.ok(codes.includes(401));
		assert.ok(codes.includes(500));
		assert.ok(!codes.includes(404), '404 does not apply to POST');
	});

	it('further filters by includedErrors allowlist', () => {
		const result = resolveDefaultErrors(DEFAULT_ERRORS, 'GET-list', [401]);
		assert.equal(result.length, 1);
		assert.equal(result[0].code, 401);
	});

	it('returns [] when includedErrors is an empty array', () => {
		const result = resolveDefaultErrors(DEFAULT_ERRORS, 'GET-list', []);
		assert.deepEqual(result, []);
	});

	it('returns only { code, response } — strips appliesTo', () => {
		const result = resolveDefaultErrors(DEFAULT_ERRORS, 'GET-list', undefined);
		result.forEach((r) => {
			assert.ok('code' in r);
			assert.ok('response' in r);
			assert.ok(!('appliesTo' in r));
		});
	});

	it('returns all matching entries when includedErrors is undefined', () => {
		const result = resolveDefaultErrors(DEFAULT_ERRORS, 'GET-single', undefined);
		const codes = result.map((r) => r.code);
		assert.ok(codes.includes(401));
		assert.ok(codes.includes(404));
		assert.ok(!codes.includes(500));
	});
});

// ─── resolveResponses ─────────────────────────────────────────────────────────

describe('resolveResponses', () => {
	it('returns [] when responses is null/undefined', () => {
		assert.deepEqual(resolveResponses(null, DEFAULT_ERRORS), []);
		assert.deepEqual(resolveResponses(undefined, DEFAULT_ERRORS), []);
	});

	it('passes through full response objects unchanged', () => {
		const full = [{ code: 200, response: { id: 1 } }];
		assert.deepEqual(resolveResponses(full, DEFAULT_ERRORS), full);
	});

	it('expands integer shorthands by looking up defaultErrors', () => {
		const result = resolveResponses([401], DEFAULT_ERRORS);
		assert.equal(result.length, 1);
		assert.equal(result[0].code, 401);
		assert.deepEqual(result[0].response, { code: 401, message: 'Unauthorized' });
	});

	it('drops integer shorthands with no matching defaultError', () => {
		const result = resolveResponses([999], DEFAULT_ERRORS);
		assert.deepEqual(result, []);
	});

	it('handles mixed array of full objects and shorthands', () => {
		const input = [{ code: 200, response: [{ id: 1 }] }, 401, 999];
		const result = resolveResponses(input, DEFAULT_ERRORS);
		assert.equal(result.length, 2);
		assert.equal(result[0].code, 200);
		assert.equal(result[1].code, 401);
	});

	it('returns [] for an empty responses array', () => {
		assert.deepEqual(resolveResponses([], DEFAULT_ERRORS), []);
	});

	it('works when allDefaultErrors is undefined (no shorthand expansion)', () => {
		const full = [{ code: 200, response: {} }];
		assert.deepEqual(resolveResponses(full, undefined), full);
	});
});

// ─── tabula.mjs helpers: isNewer ──────────────────────────────────────────────
// Copied verbatim — pure semver comparison, no I/O.

const isNewer = (a, b) => {
	const parse = (v) => v.split('.').map((n) => parseInt(n, 10) || 0);
	const [aMaj, aMin, aPat] = parse(a);
	const [bMaj, bMin, bPat] = parse(b);
	if (bMaj !== aMaj) return bMaj > aMaj;
	if (bMin !== aMin) return bMin > aMin;
	return bPat > aPat;
};

describe('isNewer (version comparison)', () => {
	it('returns true when major is newer', () => assert.ok(isNewer('1.0.0', '2.0.0')));
	it('returns true when minor is newer', () => assert.ok(isNewer('1.0.0', '1.1.0')));
	it('returns true when patch is newer', () => assert.ok(isNewer('1.0.0', '1.0.1')));
	it('returns false when versions are equal', () => assert.ok(!isNewer('1.2.3', '1.2.3')));
	it('returns false when a is newer', () => assert.ok(!isNewer('2.0.0', '1.9.9')));
	it('returns false when minor is older', () => assert.ok(!isNewer('1.5.0', '1.4.9')));
	it('handles single-digit strings', () => assert.ok(isNewer('0.0.0', '0.0.1')));
	it('handles non-numeric segments gracefully (treated as 0)', () =>
		assert.ok(!isNewer('1.0.0', '1.0.x')));
});
