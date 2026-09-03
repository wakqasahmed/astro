import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { getPackage } from '../../../dist/cli/install-package.js';
import { defaultLogger } from '../test-utils.ts';

describe('getPackage', () => {
	it('resolves packages from the project cwd, not from astro install location', async () => {
		// Create a temporary directory simulating a project with a fake package
		const projectDir = join(tmpdir(), `astro-test-getpackage-${Date.now()}`);
		const pkgDir = join(projectDir, 'node_modules', 'fake-test-pkg');

		try {
			await mkdir(pkgDir, { recursive: true });
			await writeFile(
				join(pkgDir, 'package.json'),
				JSON.stringify({
					name: 'fake-test-pkg',
					version: '1.0.0',
					main: 'index.js',
					type: 'module',
				}),
			);
			await writeFile(join(pkgDir, 'index.js'), 'export const loaded = true;\n');

			// getPackage should resolve from the project cwd, finding the fake package
			const result = await getPackage<{ loaded: boolean }>('fake-test-pkg', defaultLogger, {
				cwd: projectDir,
				optional: true,
			});

			assert.ok(result, 'Expected getPackage to find the package in the project cwd');
			assert.equal(result.loaded, true, 'Expected the loaded export to be true');
		} finally {
			await rm(projectDir, { recursive: true, force: true });
		}
	});

	it('treats TypeScript 7 without a default export as installed', async () => {
		const projectDir = join(tmpdir(), `astro-test-typescript-7-${Date.now()}`);
		const pkgDir = join(projectDir, 'node_modules', 'typescript');

		try {
			await mkdir(pkgDir, { recursive: true });
			await writeFile(
				join(pkgDir, 'package.json'),
				JSON.stringify({
					name: 'typescript',
					version: '7.0.0',
					exports: { './package.json': './package.json' },
				}),
			);

			const result = await getPackage('typescript', defaultLogger, {
				cwd: projectDir,
				optional: true,
			});

			assert.ok(result);
		} finally {
			await rm(projectDir, { recursive: true, force: true });
		}
	});

	it('rethrows export-map errors for TypeScript versions before 7', async () => {
		const projectDir = join(tmpdir(), `astro-test-typescript-6-${Date.now()}`);
		const pkgDir = join(projectDir, 'node_modules', 'typescript');

		try {
			await mkdir(pkgDir, { recursive: true });
			await writeFile(
				join(pkgDir, 'package.json'),
				JSON.stringify({
					name: 'typescript',
					version: '6.0.0',
					exports: { './package.json': './package.json' },
				}),
			);

			await assert.rejects(
				getPackage('typescript', defaultLogger, { cwd: projectDir, optional: true }),
				{ code: 'ERR_PACKAGE_PATH_NOT_EXPORTED' },
			);
		} finally {
			await rm(projectDir, { recursive: true, force: true });
		}
	});

	it('rethrows export-map errors when the TypeScript package manifest cannot be read', async () => {
		const projectDir = join(tmpdir(), `astro-test-typescript-unreadable-${Date.now()}`);
		const pkgDir = join(projectDir, 'node_modules', 'typescript');

		try {
			await mkdir(pkgDir, { recursive: true });
			await writeFile(
				join(pkgDir, 'package.json'),
				JSON.stringify({
					name: 'typescript',
					version: '7.0.0',
					exports: { './package.json': './missing-package.json' },
				}),
			);

			await assert.rejects(
				getPackage('typescript', defaultLogger, { cwd: projectDir, optional: true }),
				{ code: 'ERR_PACKAGE_PATH_NOT_EXPORTED' },
			);
		} finally {
			await rm(projectDir, { recursive: true, force: true });
		}
	});
});
