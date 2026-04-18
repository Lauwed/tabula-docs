#!/usr/bin/env node

import { createServer } from 'node:http';
import { createReadStream, existsSync } from 'node:fs';
import { cp, mkdir, readdir } from 'node:fs/promises';
import { extname, join, resolve } from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

// ─── Helpers ────────────────────────────────────────────────────────────────

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

const usage = () => {
	console.log(`
${bold('tabula')} — Static, dependency-free API documentation

${bold('Usage')}
  tabula init [dir]          Scaffold a new docs folder (default: ./tabula-docs)
  tabula validate [path]     Validate an api.json file   (default: ./api.json)
  tabula serve [dir]         Serve a docs folder locally  (default: .)

${bold('Options')}
  --port <number>            Port for tabula serve        (default: 3000)
  --help, -h                 Show this help message
  --version, -v              Show the package version

${bold('Examples')}
  tabula init my-api-docs
  tabula validate my-api-docs/api.json
  tabula serve my-api-docs --port 8080
`);
};

const version = () => {
	// Resolve package.json relative to this file in the installed package
	import(join(__dirname, '..', 'package.json'), { assert: { type: 'json' } })
		.then((m) => console.log(m.default.version))
		.catch(() => console.log('unknown'));
};

// ─── Commands ────────────────────────────────────────────────────────────────

/**
 * Copies src/ and examples/minimal/api.json into the target directory.
 * Creates the directory (and any parents) if it does not exist.
 *
 * @param {string} dir - Target directory path.
 */
async function cmdInit(dir) {
	const target = resolve(dir);
	const srcDir = resolve(__dirname, '..', 'src');
	const minimalApi = resolve(__dirname, '..', 'examples', 'minimal', 'api.json');

	// Guard: refuse to overwrite an existing non-empty directory
	if (existsSync(target)) {
		const entries = await readdir(target);
		if (entries.length > 0) {
			console.error(red(`Error: "${target}" already exists and is not empty.`));
			console.error('Choose a different directory or empty it first.');
			process.exit(1);
		}
	}

	console.log(`Scaffolding into ${bold(target)} …`);

	await mkdir(target, { recursive: true });

	// Copy all src/ files
	await cp(srcDir, target, { recursive: true });
	console.log(green('  ✓') + ' Copied src/ files');

	// Copy the minimal api.json next to index.html
	await cp(minimalApi, join(target, 'api.json'));
	console.log(green('  ✓') + ' Copied api.json (minimal example)');

	console.log(`
${green('Done!')} Your docs folder is ready.

Next steps:
  cd ${dir}
  ${bold('edit api.json')}        — describe your API
  ${bold('tabula serve .')}       — preview in the browser
  ${bold('tabula validate .')}    — check for schema errors
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
 * @param {string} dir   - Directory to serve.
 * @param {number} port  - Port to listen on.
 */
function cmdServe(dir, port) {
	const root = resolve(dir);

	if (!existsSync(root)) {
		console.error(red(`Error: directory not found — ${root}`));
		process.exit(1);
	}

	const server = createServer((req, res) => {
		// Strip query string and decode URI
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
			console.error(`Try a different port:  tabula serve ${dir} --port ${port + 1}`);
		} else {
			console.error(red(`Server error: ${err.message}`));
		}
		process.exit(1);
	});
}

// ─── Argument parser ─────────────────────────────────────────────────────────

const args = process.argv.slice(2);

if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
	usage();
	process.exit(0);
}

if (args.includes('--version') || args.includes('-v')) {
	version();
	process.exit(0);
}

const command = args[0];

// Parse --port flag
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

// Positional argument (directory or file path), ignoring flags
const positional = args.slice(1).find((a) => !a.startsWith('-'));

switch (command) {
	case 'init':
		await cmdInit(positional ?? 'tabula-docs');
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

