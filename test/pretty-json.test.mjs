/**
 * pretty-json.js unit tests — pure logic, no DOM needed.
 * The module is loaded via a thin shim that mocks the browser global it writes to.
 * Run: node --test test/pretty-json.test.mjs
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import vm from 'node:vm';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

// Load and evaluate pretty-json.js in a sandbox.
// The module uses `const` at the top level, which vm does not hoist onto the
// context object, so we wrap the source in an IIFE that returns the value.
const src = await readFile(
	join(__dirname, '..', 'src', 'assets', 'scripts', 'pretty-json.js'),
	'utf-8',
);
const prettyPrintJson = vm.runInNewContext(`(function(){ ${src}; return prettyPrintJson; })()`, {});
const toHtml = prettyPrintJson.toHtml;

// ─── Output structure ─────────────────────────────────────────────────────────

describe('output structure', () => {
	it('returns a string', () => {
		assert.equal(typeof toHtml({}), 'string');
	});

	it('wraps output in <ol class="json-lines json-container">', () => {
		const out = toHtml({});
		assert.ok(out.includes('<ol class="json-lines json-container">'));
	});

	it('each line is wrapped in <li>', () => {
		const out = toHtml({ a: 1 });
		assert.ok(out.includes('<li>'));
	});
});

// ─── Primitive types ──────────────────────────────────────────────────────────

describe('primitive rendering', () => {
	it('renders null with json-null span', () => {
		assert.ok(toHtml(null).includes('<span class="json-null">null</span>'));
	});

	it('renders true with json-boolean span', () => {
		assert.ok(toHtml(true).includes('<span class="json-boolean">true</span>'));
	});

	it('renders false with json-boolean span', () => {
		assert.ok(toHtml(false).includes('<span class="json-boolean">false</span>'));
	});

	it('renders integer with json-number span', () => {
		assert.ok(toHtml(42).includes('<span class="json-number">42</span>'));
	});

	it('renders float with json-number span', () => {
		assert.ok(toHtml(3.14).includes('<span class="json-number">3.14</span>'));
	});

	it('renders string with json-string span', () => {
		assert.ok(toHtml('hello').includes('<span class="json-string">'));
	});

	it('includes the string value inside json-string span', () => {
		assert.ok(toHtml('hello').includes('hello'));
	});
});

// ─── HTML escaping ────────────────────────────────────────────────────────────

describe('HTML escaping', () => {
	it('escapes & in string values', () => {
		assert.ok(toHtml('a&b').includes('a&amp;b'));
	});

	it('escapes < in string values', () => {
		assert.ok(toHtml('<tag>').includes('&lt;tag&gt;'));
	});

	it('escapes " in string values', () => {
		assert.ok(toHtml('"quoted"').includes('&quot;quoted&quot;'));
	});

	it('escapes & in object keys', () => {
		const out = toHtml({ 'a&b': 1 });
		assert.ok(out.includes('a&amp;b'));
	});

	it('escapes < in object keys', () => {
		const out = toHtml({ '<key>': 1 });
		assert.ok(out.includes('&lt;key&gt;'));
	});
});

// ─── URL detection ────────────────────────────────────────────────────────────

describe('URL rendering', () => {
	it('renders http URL as a clickable link', () => {
		const out = toHtml('http://example.com');
		assert.ok(out.includes('<a class="json-link"'));
		assert.ok(out.includes('href="http://example.com"'));
	});

	it('renders https URL as a clickable link', () => {
		const out = toHtml('https://example.com/path');
		assert.ok(out.includes('<a class="json-link"'));
	});

	it('link opens in a new tab (target="_blank")', () => {
		const out = toHtml('https://example.com');
		assert.ok(out.includes('target="_blank"'));
	});

	it('does not render plain string as a link', () => {
		const out = toHtml('just a string');
		assert.ok(!out.includes('<a class="json-link"'));
	});
});

// ─── Objects ──────────────────────────────────────────────────────────────────

describe('object rendering', () => {
	it('renders key with json-key span', () => {
		const out = toHtml({ name: 'Alice' });
		assert.ok(out.includes('<span class="json-key">'));
	});

	it('renders opening brace with json-mark', () => {
		const out = toHtml({ a: 1 });
		assert.ok(out.includes('<span class="json-mark">{</span>'));
	});

	it('renders closing brace with json-mark', () => {
		const out = toHtml({ a: 1 });
		assert.ok(out.includes('<span class="json-mark">}</span>'));
	});

	it('separates multiple keys with a comma json-mark', () => {
		const out = toHtml({ a: 1, b: 2 });
		assert.ok(out.includes('<span class="json-mark">,</span>'));
	});

	it('renders empty object as {}', () => {
		const out = toHtml({});
		assert.ok(out.includes('<span class="json-mark">{}</span>'));
	});

	it('renders nested object', () => {
		const out = toHtml({ user: { id: 1 } });
		assert.ok(out.includes('<span class="json-key">&quot;user&quot;</span>'));
		assert.ok(out.includes('<span class="json-number">1</span>'));
	});
});

// ─── Arrays ───────────────────────────────────────────────────────────────────

describe('array rendering', () => {
	it('renders opening bracket with json-mark', () => {
		const out = toHtml([1]);
		assert.ok(out.includes('<span class="json-mark">[</span>'));
	});

	it('renders closing bracket with json-mark', () => {
		const out = toHtml([1]);
		assert.ok(out.includes('<span class="json-mark">]</span>'));
	});

	it('renders empty array as []', () => {
		const out = toHtml([]);
		assert.ok(out.includes('<span class="json-mark">[]</span>'));
	});

	it('renders array of numbers', () => {
		const out = toHtml([1, 2, 3]);
		assert.ok(out.includes('<span class="json-number">1</span>'));
		assert.ok(out.includes('<span class="json-number">3</span>'));
	});

	it('renders array of objects', () => {
		const out = toHtml([{ id: 1 }, { id: 2 }]);
		assert.ok(out.includes('<span class="json-key">&quot;id&quot;</span>'));
	});

	it('renders mixed array', () => {
		const out = toHtml([1, 'hello', null, true]);
		assert.ok(out.includes('<span class="json-number">1</span>'));
		assert.ok(out.includes('hello'));
		assert.ok(out.includes('<span class="json-null">null</span>'));
		assert.ok(out.includes('<span class="json-boolean">true</span>'));
	});
});

// ─── Idempotency ──────────────────────────────────────────────────────────────

describe('idempotency', () => {
	it('calling toHtml twice with the same input returns the same output', () => {
		const val = { id: 1, name: 'test', active: true, data: null };
		assert.equal(toHtml(val), toHtml(val));
	});

	it('does not accumulate state between calls', () => {
		toHtml([1, 2, 3]);
		const out = toHtml({ x: 'only' });
		// The output must not contain lines from the previous call
		assert.ok(!out.includes('<span class="json-number">2</span>'));
	});
});
