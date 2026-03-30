import { describe, expect, it } from 'bun:test';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

interface ExportEntry {
  readonly bun?: string;
}

interface PackageContract {
  readonly exports: Record<string, ExportEntry>;
  readonly files: ReadonlyArray<string>;
  readonly peerDependencies?: Record<string, string>;
}

async function packageContract(): Promise<PackageContract> {
  return Bun.file(new URL('../package.json', import.meta.url)).json();
}

function projectRoot(): string {
  return fileURLToPath(new URL('..', import.meta.url));
}

function sourceFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = join(directory, entry.name);
    if (entry.isDirectory()) {
      return sourceFiles(entryPath);
    }
    return entry.name.endsWith('.ts') ? [entryPath] : [];
  });
}

describe('package contract', () => {
  it('ships src when bun export conditions target source entrypoints', async () => {
    const pkg = await packageContract();
    const bunTargets = Object.values(pkg.exports)
      .map((entry) => entry.bun)
      .filter((value): value is string => value !== undefined);

    expect(bunTargets.length > 0).toBe(true);
    expect(bunTargets.every((target) => target.startsWith('./src/'))).toBe(true);
    expect(pkg.files.includes('src')).toBe(true);
  });

  it('keeps shared source entrypoints free of static bun: specifiers', () => {
    const files = sourceFiles(join(projectRoot(), 'src'));
    const offenders = files.filter((file) => readFileSync(file, 'utf8').includes('bun:'));

    expect(offenders).toEqual([]);
  });

  it('keeps URL codec declarations free of ambient URL globals', () => {
    const codecSource = readFileSync(join(projectRoot(), 'src/type/codec-builtins.ts'), 'utf8');
    const urlLikeSource = readFileSync(join(projectRoot(), 'src/shared/url-like.ts'), 'utf8');

    expect(urlLikeSource.includes('export interface URLLike')).toBe(true);
    expect(codecSource.includes("export type { URLLike } from '../shared/url-like.js';")).toBe(true);
    expect(codecSource.includes('export type TURLCodec = TCodec<TString, URL>;')).toBe(false);
  });

  it('does not require TypeScript as a consumer peer dependency', async () => {
    const pkg = await packageContract();

    expect(pkg.peerDependencies?.typescript).toBeUndefined();
  });
});
