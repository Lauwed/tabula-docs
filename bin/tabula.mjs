#!/usr/bin/env node

import { createServer } from 'node:http';
import { createReadStream, existsSync } from 'node:fs';
import { cp, mkdir, readdir } from 'node:fs/promises';
import { extname, join, resolve } from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { createInterface } from 'node:readline';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

// ─── Helpers ─────────────────────────────────────────────────────────────────

const MIME = {
	'.html': 'text/html; charset=utf-8',
	'.css': 'text/css; charset=utf-8',
	'.js': 'application/javascript; charset=utf-8',
	'.mjs': 'application/javascript; charset=utf-8',
	'.json': 'application/json; charset=utf-8',
	'.svg': 'image/svg+xml',
	'.png': 'image/png',
	'.jpg': 'image/jpeg',
	'.jpeg': 'image/jpeg',
	'.ico': 'image/x-icon',
	'.woff2': 'font/woff2',
	'.woff': 'font/woff',
};

const mime = (filePath) => MIME[extname(filePath).toLowerCase()] ?? 'application/octet-stream';

const green = (s) => `\x1b[32m${s}\x1b[0m`;
const yellow = (s) => `\x1b[33m${s}\x1b[0m`;
const red = (s) => `\x1b[31m${s}\x1b[0m`;
const bold = (s) => `\x1b[1m${s}\x1b[0m`;
const dim = (s) => `\x1b[2m${s}\x1b[0m`;
const cyan = (s) => `\x1b[36m${s}\x1b[0m`;

// ─── Template registry ────────────────────────────────────────────────────────

const TEMPLATES = [
	{ name: 'minimal', label: 'Minimal', description: '2 tables, ready in 30 seconds' },
	{ name: 'blog', label: 'Blog', description: 'Realistic CRUD — posts, users, tags' },
	{
		name: 'ecommerce',
		label: 'E-commerce',
		description: 'Advanced — uploads, order state, full auth',
	},
];

// Names of src/ files that tabula-docs sync is allowed to overwrite.
// This list must stay in sync with the actual contents of src/.
const SRC_FILES = [
	'index.html',
	'script.js',
	'styles.css',
	'constants.js',
	'endpoints.js',
	'inputs.js',
];

// ─── Version check ────────────────────────────────────────────────────────────

/**
 * Reads the local package version from package.json.
 *
 * @returns {Promise<string>} Semver string, e.g. "0.1.1", or "unknown" on failure.
 */
async function getLocalVersion() {
	try {
		const pkg = await import(join(__dirname, '..', 'package.json'), { assert: { type: 'json' } });
		return pkg.default.version ?? 'unknown';
	} catch {
		return 'unknown';
	}
}

/**
 * Compares two semver strings. Returns true if `b` is strictly greater than `a`.
 * Only handles MAJOR.MINOR.PATCH — no pre-release suffixes.
 *
 * @param {string} a - Installed version.
 * @param {string} b - Latest version.
 * @returns {boolean}
 */
function isNewer(a, b) {
	const parse = (v) => v.split('.').map((n) => parseInt(n, 10) || 0);
	const [aMaj, aMin, aPat] = parse(a);
	const [bMaj, bMin, bPat] = parse(b);
	if (bMaj !== aMaj) return bMaj > aMaj;
	if (bMin !== aMin) return bMin > aMin;
	return bPat > aPat;
}

/**
 * Fetches the latest release tag from GitHub and prints an upgrade notice if a
 * newer version is available. Runs fire-and-forget with a 3-second timeout —
 * never blocks the main command and fails silently on any network error.
 *
 * @param {string} localVersion - The currently installed version.
 * @returns {Promise<void>}
 */
async function checkForUpdates(localVersion) {
	if (localVersion === 'unknown') return;

	try {
		const res = await fetch('https://api.github.com/repos/Lauwed/tabula-docs/releases/latest', {
			headers: { 'User-Agent': 'tabula-docs-cli' },
			signal: AbortSignal.timeout(3000),
		});

		if (!res.ok) return;

		const { tag_name } = await res.json();
		if (!tag_name) return;

		const latest = tag_name.replace(/^v/, '');

		if (isNewer(localVersion, latest)) {
			console.log(yellow('\n  ╭─────────────────────────────────────────────────╮'));
			console.log(
				yellow('  │') +
					`  Update available: ${dim(`v${localVersion}`)} → ${green(`v${latest}`)}` +
					yellow('  │')
			);
			console.log(
				yellow('  │') + `  Run ${bold('npm install -g tabula-docs')} to upgrade  ` + yellow('│')
			);
			console.log(yellow('  ╰─────────────────────────────────────────────────╯\n'));
		}
	} catch {
		// Silent — no network, DNS failure, timeout, or unexpected payload.
		// Never interrupt the user's workflow for a version check.
	}
}

// ─── Usage ────────────────────────────────────────────────────────────────────

const usage = () => {
	console.log(`
${bold('tabula')} — Static, dependency-free API documentation

${bold('Usage')}
  tabula-docs init [dir] [--template <name>]   Scaffold a new docs folder
  tabula-docs sync [dir]                        Sync src/ files to the installed version
  tabula-docs validate [path]                   Validate an api.json file
  tabula-docs serve [dir] [--port <number>]     Serve a docs folder locally

${bold('init options')}
  [dir]                  Target folder name  ${dim('(wizard if omitted, default: docs)')}
  --template <name>      Starting template   ${dim('(wizard if omitted)')}
                         ${dim('Templates: minimal, blog, ecommerce')}

${bold('serve options')}
  --port <number>        Port to listen on   ${dim('(default: 3000)')}

${bold('Global options')}
  --help,    -h          Show this help message
  --version, -v          Show the package version

${bold('Examples')}
  tabula-docs init
  tabula-docs init my-api-docs --template blog
  tabula-docs sync my-api-docs
  tabula-docs validate my-api-docs/api.json
  tabula-docs serve my-api-docs --port 8080
`);
};

const printVersion = (v) => console.log(v);

// ─── Wizard helpers ───────────────────────────────────────────────────────────

/**
 * Prompts the user for a single line of text input.
 * Falls back to returning the default when stdin is not a TTY.
 *
 * @param {string} question   - Question to display.
 * @param {string} defaultVal - Value returned on empty input.
 * @returns {Promise<string>}
 */
function promptText(question, defaultVal) {
	if (!process.stdin.isTTY) return Promise.resolve(defaultVal);

	return new Promise((res) => {
		const rl = createInterface({ input: process.stdin, output: process.stdout });
		const hint = defaultVal ? dim(` (${defaultVal})`) : '';
		rl.question(`${cyan('?')} ${question}${hint}: `, (answer) => {
			rl.close();
			res(answer.trim() || defaultVal);
		});
	});
}

/**
 * Displays an arrow-key selection menu and returns the chosen item's name.
 * Falls back to the first item when stdin is not a TTY.
 *
 * @param {string} question
 * @param {{ name: string, label: string, description: string }[]} items
 * @returns {Promise<string>}
 */
function promptSelect(question, items) {
	if (!process.stdin.isTTY) return Promise.resolve(items[0].name);

	return new Promise((res) => {
		let cursor = 0;

		const render = () => {
			if (render.lineCount) process.stdout.write(`\x1b[${render.lineCount}A`);

			const lines = [`${cyan('?')} ${question}`];
			items.forEach((item, i) => {
				const pointer = i === cursor ? cyan('❯') : ' ';
				const label = i === cursor ? bold(item.label) : item.label;
				lines.push(`  ${pointer} ${label}  ${dim(item.description)}`);
			});
			process.stdout.write(lines.join('\n') + '\n');
			render.lineCount = lines.length;
		};

		render.lineCount = 0;
		render();

		process.stdin.setRawMode(true);
		process.stdin.resume();
		process.stdin.setEncoding('utf8');

		const onKey = (key) => {
			// Ctrl-C — exit gracefully
			if (key === '\x03') {
				process.stdin.setRawMode(false);
				process.stdin.pause();
				console.log('\nCancelled.');
				process.exit(0);
			}

			if (key === '\x1b[A') cursor = (cursor - 1 + items.length) % items.length; // up
			if (key === '\x1b[B') cursor = (cursor + 1) % items.length; // down

			// Enter — confirm
			if (key === '\r' || key === '\n') {
				process.stdin.setRawMode(false);
				process.stdin.pause();
				process.stdin.off('data', onKey);
				// Replace menu with a single confirmation line
				process.stdout.write(`\x1b[${render.lineCount}A`);
				process.stdout.write(`${cyan('?')} ${question}: ${bold(items[cursor].label)}\n`);
				for (let i = 1; i < render.lineCount; i++) process.stdout.write('\x1b[2K\n');
				process.stdout.write(`\x1b[${render.lineCount - 1}A`);
				res(items[cursor].name);
				return;
			}

			render();
		};

		process.stdin.on('data', onKey);
	});
}

// ─── Commands ─────────────────────────────────────────────────────────────────

/**
 * Scaffolds a new Tabula docs folder.
 *
 * - If `dir` is undefined, asks for the folder name (default: "docs").
 * - If `template` is undefined, shows a template selection menu.
 * - Refuses to overwrite a non-empty existing directory.
 *
 * @param {string|undefined} dir      - Target directory.
 * @param {string|undefined} template - Template name.
 */
async function cmdInit(dir, template) {
	// Step 1 — folder name
	const folderName = dir ?? (await promptText('Output folder name', 'docs'));

	// Step 2 — template
	let templateName = template;
	if (!templateName) {
		templateName = await promptSelect('Choose a starting template', TEMPLATES);
	} else {
		if (!TEMPLATES.find((t) => t.name === templateName)) {
			console.error(red(`Error: unknown template "${templateName}".`));
			console.error(`Available templates: ${TEMPLATES.map((t) => t.name).join(', ')}`);
			process.exit(1);
		}
	}

	// Step 3 — paths
	const target = resolve(folderName);
	const srcDir = resolve(__dirname, '..', 'src');
	const templateApi = resolve(__dirname, '..', 'examples', templateName, 'api.json');

	if (existsSync(target)) {
		const entries = await readdir(target);
		if (entries.length > 0) {
			console.error(red(`\nError: "${target}" already exists and is not empty.`));
			console.error('Choose a different folder name or empty it first.');
			process.exit(1);
		}
	}

	// Step 4 — scaffold
	console.log(`\nScaffolding into ${bold(target)} …`);

	await mkdir(target, { recursive: true });

	await cp(srcDir, target, { recursive: true });
	console.log(green('  ✓') + ' Copied src/ files (index.html, scripts, styles)');

	await cp(templateApi, join(target, 'api.json'));
	console.log(green('  ✓') + ` Copied api.json (${templateName} template)`);

	console.log(`
${green('Done!')} Your docs folder is ready.

  cd ${folderName}
  ${bold('$EDITOR api.json')}      — describe your API
  ${bold('tabula-docs serve .')}        — preview in the browser
  ${bold('tabula-docs validate .')}     — check for schema errors
`);
}

/**
 * Syncs src/ files in an existing Tabula docs folder to the currently installed
 * package version. Preserves api.json and any custom assets.
 *
 * @param {string} dir - Path to the existing docs folder.
 */
async function cmdSync(dir) {
	const target = resolve(dir);
	const srcDir = resolve(__dirname, '..', 'src');

	if (!existsSync(target)) {
		console.error(red(`Error: directory not found — ${target}`));
		console.error('Run tabula-docs init to create a new docs folder.');
		process.exit(1);
	}

	if (!existsSync(join(target, 'index.html'))) {
		console.error(red(`Error: "${target}" does not look like a Tabula docs folder.`));
		console.error('Expected to find index.html — are you pointing at the right directory?');
		process.exit(1);
	}

	const currentVersion = await getLocalVersion();

	console.log(`Syncing ${bold(target)} to tabula-docs ${bold(`v${currentVersion}`)} …\n`);

	for (const file of SRC_FILES) {
		const src = join(srcDir, file);
		const dest = join(target, file);

		if (!existsSync(src)) {
			console.log(yellow('  –') + ` Skipped ${file} ${dim('(not found in package)')}`);
			continue;
		}

		await cp(src, dest, { force: true });
		console.log(green('  ✓') + ` Updated ${file}`);
	}

	console.log(`
${green('Done!')} src/ files updated to v${currentVersion}.

  ${dim('api.json and custom assets were not modified.')}
  Run ${bold('tabula-docs serve ' + dir)} to verify the update.
`);
}

/**
 * Runs validate-api.mjs on the given path, printing errors and warnings.
 * Exits with code 1 if any errors are found.
 *
 * @param {string} apiPath - Path to the api.json file to validate.
 */
function cmdValidate(apiPath) {
	const validator = resolve(__dirname, 'validate-api.mjs');
	const target = resolve(apiPath);

	if (!existsSync(target)) {
		console.error(red(`Error: file not found — ${target}`));
		process.exit(1);
	}

	console.log(`Validating ${bold(target)} …\n`);

	const child = spawn(process.execPath, [validator, target], { stdio: 'inherit' });

	child.on('close', (code) => {
		if (code === 0) {
			console.log(`\n${green('✓')} No errors found.`);
		} else {
			console.error(`\n${red('✗')} Validation failed — fix the errors above before deploying.`);
		}
		process.exit(code);
	});
}

/**
 * Starts a local static HTTP server serving the given directory.
 * Defaults to index.html for directory requests.
 *
 * @param {string} dir  - Directory to serve.
 * @param {number} port - Port to listen on.
 */
function cmdServe(dir, port) {
	const root = resolve(dir);

	if (!existsSync(root)) {
		console.error(red(`Error: directory not found — ${root}`));
		process.exit(1);
	}

	const server = createServer((req, res) => {
		let pathname = decodeURIComponent(req.url.split('?')[0]);
		if (pathname === '/') pathname = '/index.html';

		const filePath = join(root, pathname);

		// Prevent path traversal outside root
		if (!filePath.startsWith(root)) {
			res.writeHead(403);
			res.end('Forbidden');
			return;
		}

		if (!existsSync(filePath)) {
			res.writeHead(404, { 'Content-Type': 'text/plain' });
			res.end(`404 — Not found: ${pathname}`);
			return;
		}

		res.writeHead(200, { 'Content-Type': mime(filePath) });
		createReadStream(filePath).pipe(res);
	});

	server.listen(port, 'localhost', () => {
		console.log(`
${green('✓')} Serving ${bold(root)}

  ${bold(`http://localhost:${port}`)}

Press ${bold('Ctrl+C')} to stop.
`);
	});

	server.on('error', (err) => {
		if (err.code === 'EADDRINUSE') {
			console.error(red(`Error: port ${port} is already in use.`));
			console.error(`Try a different port:  tabula-docs serve ${dir} --port ${port + 1}`);
		} else {
			console.error(red(`Server error: ${err.message}`));
		}
		process.exit(1);
	});
}

// ─── Argument parser ──────────────────────────────────────────────────────────

const args = process.argv.slice(2);

if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
	usage();
	process.exit(0);
}

const localVersion = await getLocalVersion();

if (args.includes('--version') || args.includes('-v')) {
	printVersion(localVersion);
	process.exit(0);
}

// Fire-and-forget update check — runs concurrently with the command, never
// blocks it, and prints the notice (if any) after the command output settles.
const updateCheckPromise = checkForUpdates(localVersion);

const command = args[0];

// Parse --port flag (serve)
let port = 3000;
const portIdx = args.indexOf('--port');
if (portIdx !== -1) {
	const raw = parseInt(args[portIdx + 1], 10);
	if (isNaN(raw) || raw < 1 || raw > 65535) {
		console.error(red('Error: --port must be a number between 1 and 65535.'));
		process.exit(1);
	}
	port = raw;
}

// Parse --template flag (init)
let templateArg;
const templateIdx = args.indexOf('--template');
if (templateIdx !== -1) {
	templateArg = args[templateIdx + 1];
	if (!templateArg || templateArg.startsWith('-')) {
		console.error(red('Error: --template requires a value (minimal, blog, ecommerce).'));
		process.exit(1);
	}
}

// Positional argument — first non-flag token after the command, excluding flag values
const flagsWithValues = new Set();
['--port', '--template'].forEach((f) => {
	const i = args.indexOf(f);
	if (i !== -1) {
		flagsWithValues.add(args[i]);
		flagsWithValues.add(args[i + 1]);
	}
});
const positional = args.slice(1).find((a) => !a.startsWith('-') && !flagsWithValues.has(a));

switch (command) {
	case 'init':
		await cmdInit(positional, templateArg);
		break;

	case 'sync':
		await cmdSync(positional ?? '.');
		break;

	case 'validate':
		cmdValidate(positional ?? './api.json');
		break;

	case 'serve':
		cmdServe(positional ?? '.', port);
		break;

	default:
		console.error(red(`Unknown command: "${command}"\n`));
		usage();
		process.exit(1);
}

// Await the update check so the notice prints before the process exits.
// For long-running commands (serve), this resolves quickly in the background.
await updateCheckPromise;
