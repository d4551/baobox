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

  it('rewrites @sinclair/typebox/system to baobox/system', () => {
    const result = transformImport("import { TypeSystemPolicy } from '@sinclair/typebox/system';");
    expect(result.changed).toBe(true);
    expect(result.line).toBe("import { TypeSystemPolicy } from 'baobox/system';");
  });

  it('rewrites @sinclair/typebox/format to baobox/format', () => {
    const result = transformImport("import { FormatRegistry } from '@sinclair/typebox/format';");
    expect(result.changed).toBe(true);
    expect(result.line).toBe("import { FormatRegistry } from 'baobox/format';");
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

  it('rewrites Value.Check to Check', () => {
    const result = transformApiCalls('const valid = Value.Check(schema, data);');
    expect(result.changed).toBe(true);
    expect(result.line).toBe('const valid = Check(schema, data);');
  });

  it('rewrites Value.Clean to Clean', () => {
    const result = transformApiCalls('const cleaned = Value.Clean(schema, data);');
    expect(result.changed).toBe(true);
    expect(result.line).toBe('const cleaned = Clean(schema, data);');
  });

  it('rewrites Value.Decode to Decode', () => {
    const result = transformApiCalls('const decoded = Value.Decode(schema, data);');
    expect(result.changed).toBe(true);
    expect(result.line).toBe('const decoded = Decode(schema, data);');
  });

  it('rewrites Value.Encode to Encode', () => {
    const result = transformApiCalls('const encoded = Value.Encode(schema, data);');
    expect(result.changed).toBe(true);
    expect(result.line).toBe('const encoded = Encode(schema, data);');
  });

  it('rewrites Value.Create to Create', () => {
    const result = transformApiCalls('const obj = Value.Create(schema);');
    expect(result.changed).toBe(true);
    expect(result.line).toBe('const obj = Create(schema);');
  });

  it('rewrites Value.Default to Default', () => {
    const result = transformApiCalls('Value.Default(schema, obj);');
    expect(result.changed).toBe(true);
    expect(result.line).toBe('Default(schema, obj);');
  });

  it('rewrites Value.Convert to Convert', () => {
    const result = transformApiCalls('const converted = Value.Convert(schema, data);');
    expect(result.changed).toBe(true);
    expect(result.line).toBe('const converted = Convert(schema, data);');
  });

  it('rewrites Value.Parse to Parse', () => {
    const result = transformApiCalls('const parsed = Value.Parse(schema, data);');
    expect(result.changed).toBe(true);
    expect(result.line).toBe('const parsed = Parse(schema, data);');
  });

  it('rewrites Value.Assert to Assert', () => {
    const result = transformApiCalls('Value.Assert(schema, data);');
    expect(result.changed).toBe(true);
    expect(result.line).toBe('Assert(schema, data);');
  });

  it('does not change unrelated code', () => {
    const result = transformApiCalls('const x = doSomething();');
    expect(result.changed).toBe(false);
  });

  it('skips comment lines', () => {
    const result = transformApiCalls('// Value.Check(schema, data);');
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

  it('flags TypeSystemPolicy usage', () => {
    const items = detectManualReviewItems('TypeSystemPolicy.AllowNaN = true;', 7);
    expect(items.length).toBe(1);
    expect(items[0]).toContain('TypeSystemPolicy');
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
