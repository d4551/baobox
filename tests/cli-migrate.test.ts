import { describe, expect, it, beforeAll, afterAll } from 'bun:test';
import { transformImport } from '../src/cli/transforms/imports.ts';
import { transformApiCalls, detectManualReviewItems } from '../src/cli/transforms/api-calls.ts';
import { migrate } from '../src/cli/migrate.ts';
import { writeFile, mkdir, rm } from 'node:fs/promises';
import { join } from 'node:path';

describe('import transforms', () => {
  it('rewrites @sinclair/typebox to baobox', () => {
    const result = transformImport("import { Type } from '@sinclair/typebox';");
    expect(result.changed).toBe(true);
    expect(result.line).toBe("import { Type } from 'baobox';");
  });

  it('rewrites @sinclair/typebox/value to baobox/value', () => {
    const result = transformImport('import { Value } from "@sinclair/typebox/value";');
    expect(result.changed).toBe(true);
    expect(result.line).toBe("import { Value } from 'baobox/value';");
  });

  it('rewrites @sinclair/typebox/compiler to baobox/compile', () => {
    const result = transformImport("import { TypeCompiler } from '@sinclair/typebox/compiler';");
    expect(result.changed).toBe(true);
    expect(result.line).toBe("import { TypeCompiler } from 'baobox/compile';");
  });

  it('does not change unrelated imports', () => {
    const result = transformImport("import express from 'express';");
    expect(result.changed).toBe(false);
    expect(result.line).toBe("import express from 'express';");
  });
});

describe('API call transforms', () => {
  it('rewrites TypeCompiler.Compile to Compile', () => {
    const result = transformApiCalls('const validator = TypeCompiler.Compile(schema);');
    expect(result.changed).toBe(true);
    expect(result.line).toBe('const validator = Compile(schema);');
  });

  it('does not change unrelated code', () => {
    const result = transformApiCalls('const x = doSomething();');
    expect(result.changed).toBe(false);
  });
});

describe('manual review detection', () => {
  it('flags [Kind] symbol usage', () => {
    const items = detectManualReviewItems("const kind = schema[Kind];", 10);
    expect(items.length).toBe(1);
    expect(items[0]).toContain('[Kind]');
  });

  it('flags Value.Errors usage', () => {
    const items = detectManualReviewItems('const errors = Value.Errors(schema, value);', 5);
    expect(items.length).toBe(1);
    expect(items[0]).toContain('ErrorsIterator');
  });
});

describe('migrate integration', () => {
  const tmpDir = join(import.meta.dir, '.tmp-migrate-test');

  beforeAll(async () => {
    await mkdir(tmpDir, { recursive: true });
    await writeFile(
      join(tmpDir, 'app.ts'),
      [
        "import { Type } from '@sinclair/typebox';",
        "import { Value } from '@sinclair/typebox/value';",
        "import { TypeCompiler } from '@sinclair/typebox/compiler';",
        '',
        'const Schema = Type.Object({ name: Type.String() });',
        'const compiled = TypeCompiler.Compile(Schema);',
        'const errors = Value.Errors(Schema, {});',
      ].join('\n'),
    );
    await writeFile(join(tmpDir, 'unrelated.ts'), "import express from 'express';");
  });

  afterAll(async () => {
    await rm(tmpDir, { recursive: true, force: true });
  });

  it('detects TypeBox imports in dry run', async () => {
    const report = await migrate({ dryRun: true, path: tmpDir, report: true });
    expect(report.filesScanned).toBeGreaterThanOrEqual(1);
    expect(report.filesChanged).toBe(1);
    expect(report.totalTransforms).toBeGreaterThan(0);
  });

  it('flags manual review items', async () => {
    const report = await migrate({ dryRun: true, path: tmpDir, report: true });
    expect(report.totalManualReviewItems).toBeGreaterThan(0);
  });

  it('transforms import paths correctly', async () => {
    const report = await migrate({ dryRun: true, path: tmpDir, report: true });
    const change = report.changes[0]!;
    expect(change.transformedLines[0]).toContain("'baobox'");
    expect(change.transformedLines[1]).toContain("'baobox/value'");
    expect(change.transformedLines[2]).toContain("'baobox/compile'");
  });
});
