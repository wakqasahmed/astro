import assert from 'node:assert/strict';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, it } from 'node:test';
import { resolveTypeScriptPath } from '../dist/index.js';

function createExportMapError() {
	const error = new Error('Package path not exported') as NodeJS.ErrnoException;
	error.code = 'ERR_PACKAGE_PATH_NOT_EXPORTED';
	return error;
}

describe('resolveTypeScriptPath', () => {
	it('returns the resolved path when resolution succeeds', () => {
		const result = resolveTypeScriptPath(() => '/some/path/to/typescript/lib/typescript.js');
		assert.equal(result, '/some/path/to/typescript/lib/typescript.js');
	});

	it('returns undefined for TypeScript 7 without a default export', async () => {
		const projectDir = join(tmpdir(), `astro-check-typescript-7-${Date.now()}`);
		const packageJsonPath = join(projectDir, 'package.json');

		try {
			await mkdir(projectDir, { recursive: true });
			await writeFile(packageJsonPath, JSON.stringify({ version: '7.0.0' }));

			const result = resolveTypeScriptPath((id) => {
				if (id === 'typescript') throw createExportMapError();
				return packageJsonPath;
			});

			assert.equal(result, undefined);
		} finally {
			await rm(projectDir, { recursive: true, force: true });
		}
	});

	it('rethrows export-map errors for TypeScript versions before 7', async () => {
		const projectDir = join(tmpdir(), `astro-check-typescript-6-${Date.now()}`);
		const packageJsonPath = join(projectDir, 'package.json');

		try {
			await mkdir(projectDir, { recursive: true });
			await writeFile(packageJsonPath, JSON.stringify({ version: '6.0.0' }));
			const error = createExportMapError();

			assert.throws(
				() =>
					resolveTypeScriptPath((id) => {
						if (id === 'typescript') throw error;
						return packageJsonPath;
					}),
				(thrown) => thrown === error,
			);
		} finally {
			await rm(projectDir, { recursive: true, force: true });
		}
	});

	it('rethrows export-map errors when the TypeScript package manifest cannot be read', () => {
		const error = createExportMapError();

		assert.throws(
			() =>
				resolveTypeScriptPath((id) => {
					if (id === 'typescript') throw error;
					return join(tmpdir(), `missing-typescript-package-${Date.now()}.json`);
				}),
			(thrown) => thrown === error,
		);
	});
});
