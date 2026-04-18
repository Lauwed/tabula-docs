/**
 * Validator tests — node:test, zero dependencies.
 * Run: node --test test/
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const VALIDATOR = join(__dirname, '..', 'bin', 'validate-api.mjs');
const FIXTURES = join(__dirname, 'fixtures');

function run(fixture) {
	const result = spawnSync(process.execPath, [VALIDATOR, join(FIXTURES, fixture)], {
		encoding: 'utf-8',
	});
	return { code: result.status, stdout: result.stdout ?? '', stderr: result.stderr ?? '' };
}

describe('valid fixture', () => {
	it('exits with code 0 and reports no errors', () => {
		const { code, stdout } = run('valid.json');
		assert.equal(code, 0);
		assert.ok(stdout.includes('All checks passed'));
	});
});

describe('duplicate table name.singular', () => {
	it('exits with code 1', () => assert.equal(run('invalid-duplicate-singular.json').code, 1));
	it('reports the duplicate name', () => assert.ok(run('invalid-duplicate-singular.json').stderr.includes('user')));
});

describe('missing isPrimary uriParameter', () => {
	it('exits with code 1', () => assert.equal(run('invalid-missing-primary.json').code, 1));
	it('reports isPrimary in error', () => assert.ok(run('invalid-missing-primary.json').stderr.includes('isPrimary')));
});

describe('foreignKey reference to unknown table', () => {
	it('exits with code 1', () => assert.equal(run('invalid-unknown-foreignkey.json').code, 1));
	it('reports the unknown table name', () => assert.ok(run('invalid-unknown-foreignkey.json').stderr.includes('ghost')));
});

describe('duplicate defaultErrors code', () => {
	it('exits with code 1', () => assert.equal(run('invalid-duplicate-error-code.json').code, 1));
	it('reports the duplicate code', () => assert.ok(run('invalid-duplicate-error-code.json').stderr.includes('404')));
});

describe('invalid defaultErrors appliesTo value', () => {
	it('exits with code 1', () => assert.equal(run('invalid-bad-applies-to.json').code, 1));
	it('reports the invalid method', () => assert.ok(run('invalid-bad-applies-to.json').stderr.includes('PATCH')));
});

describe('invalid schema type notation', () => {
	it('exits with code 1', () => assert.equal(run('invalid-bad-schema-type.json').code, 1));
	it('reports the invalid type string', () => assert.ok(run('invalid-bad-schema-type.json').stderr.includes('notAValidType')));
});

describe('customEndpoints shorthand referencing unknown defaultError code', () => {
	it('exits with code 1', () => assert.equal(run('invalid-shorthand-unknown-code.json').code, 1));
	it('reports the unknown code', () => assert.ok(run('invalid-shorthand-unknown-code.json').stderr.includes('999')));
});

describe('select listParameter without options', () => {
	it('exits with code 1', () => assert.equal(run('invalid-select-no-options.json').code, 1));
	it('reports missing options', () => assert.ok(run('invalid-select-no-options.json').stderr.includes('options')));
});

describe('uriParameter missing defaultValue', () => {
	it('exits with code 1', () => assert.equal(run('invalid-missing-uri-default-value.json').code, 1));
	it('reports missing defaultValue', () => assert.ok(run('invalid-missing-uri-default-value.json').stderr.includes('defaultValue')));
});

describe('examples/minimal/api.json', () => {
	it('passes validation', () => {
		const r = spawnSync(process.execPath, [VALIDATOR, join(__dirname, '..', 'examples', 'minimal', 'api.json')], { encoding: 'utf-8' });
		assert.equal(r.status, 0);
	});
});

describe('examples/blog/api.json', () => {
	it('passes validation', () => {
		const r = spawnSync(process.execPath, [VALIDATOR, join(__dirname, '..', 'examples', 'blog', 'api.json')], { encoding: 'utf-8' });
		assert.equal(r.status, 0);
	});
});

describe('examples/ecommerce/api.json', () => {
	it('passes validation', () => {
		const r = spawnSync(process.execPath, [VALIDATOR, join(__dirname, '..', 'examples', 'ecommerce', 'api.json')], { encoding: 'utf-8' });
		assert.equal(r.status, 0);
	});
});

