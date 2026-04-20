/**
 * src/ structure tests — verifies the expected file layout after the assets/ reorganisation.
 * Run: node --test test/src.test.mjs
 */

import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const SRC = join(__dirname, '..', 'src');

// ─── File presence ────────────────────────────────────────────────────────────

describe('src/ file structure', () => {
	const expected = [
		'index.html',
		'assets/scripts/pretty-json.js',
		'assets/scripts/constants.js',
		'assets/scripts/endpoints.js',
		'assets/scripts/inputs.js',
		'assets/scripts/script.js',
		'assets/styles/styles.css',
		'assets/images/logo.svg',
		'assets/images/favicon.svg',
	];

	for (const file of expected) {
		it(`${file} exists`, () => {
			assert.ok(existsSync(join(SRC, file)), `Missing: src/${file}`);
		});
	}

	const removed = ['script.js', 'styles.css', 'constants.js', 'endpoints.js', 'inputs.js'];

	for (const file of removed) {
		it(`${file} no longer exists at src/ root`, () => {
			assert.ok(!existsSync(join(SRC, file)), `Should have been moved: src/${file}`);
		});
	}
});

// ─── index.html integrity ─────────────────────────────────────────────────────

describe('src/index.html', () => {
	let html;

	before(async () => {
		html = await readFile(join(SRC, 'index.html'), 'utf-8');
	});

	it('references assets/styles/styles.css', () => {
		assert.ok(html.includes('assets/styles/styles.css'), 'stylesheet path not updated');
	});

	it('references assets/scripts/pretty-json.js', () => {
		assert.ok(html.includes('assets/scripts/pretty-json.js'), 'pretty-json script path not updated');
	});

	it('references assets/scripts/constants.js', () => {
		assert.ok(html.includes('assets/scripts/constants.js'));
	});

	it('references assets/scripts/endpoints.js', () => {
		assert.ok(html.includes('assets/scripts/endpoints.js'));
	});

	it('references assets/scripts/inputs.js', () => {
		assert.ok(html.includes('assets/scripts/inputs.js'));
	});

	it('references assets/scripts/script.js', () => {
		assert.ok(html.includes('assets/scripts/script.js'));
	});

	it('has no cdn.jsdelivr.net references', () => {
		assert.ok(!html.includes('cdn.jsdelivr.net'), 'CDN dependency still present in index.html');
	});

	it('has no flat-root script references (e.g. src="script.js")', () => {
		assert.ok(!html.match(/src="(?!assets\/)[^"]+\.js"/), 'Flat-root JS reference found');
	});

	it('has no flat-root stylesheet references (e.g. href="styles.css")', () => {
		assert.ok(!html.match(/href="(?!assets\/)[^"]+\.css"/), 'Flat-root CSS reference found');
	});
});

// ─── styles.css integrity ─────────────────────────────────────────────────────

describe('src/assets/styles/styles.css', () => {
	let css;

	before(async () => {
		css = await readFile(join(SRC, 'assets/styles/styles.css'), 'utf-8');
	});

	it('has no cdn.jsdelivr.net references', () => {
		assert.ok(!css.includes('cdn.jsdelivr.net'));
	});

	it('has no pretty-print-json CDN comment', () => {
		assert.ok(!css.includes('pretty-print-json theme override'));
	});

	it('defines json-key class', () => {
		assert.ok(css.includes('.json-key'));
	});

	it('defines json-string class', () => {
		assert.ok(css.includes('.json-string'));
	});

	it('defines json-number class', () => {
		assert.ok(css.includes('.json-number'));
	});

	it('defines json-boolean class', () => {
		assert.ok(css.includes('.json-boolean'));
	});

	it('defines json-null class', () => {
		assert.ok(css.includes('.json-null'));
	});

	it('defines json-mark class', () => {
		assert.ok(css.includes('.json-mark'));
	});
});
