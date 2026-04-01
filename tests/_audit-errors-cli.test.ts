import { describe, expect, it } from 'bun:test';
import { ErrorsIterator, ValueErrorType } from '../src/value/errors-compat.ts';
import { Value } from '../src/value/index.ts';
import Baobox from '../src/index.ts';
import { transformImport } from '../src/cli/transforms/imports.ts';
import { transformApiCalls, detectManualReviewItems } from '../src/cli/transforms/api-calls.ts';

describe('AUDIT: ErrorsIterator edge cases', () => {
  it('returns empty iterator for valid input', () => {
    const schema = Baobox.Object({ name: Baobox.String() });
    const errors = Array.from(ErrorsIterator(schema, { name: 'Ada' }));
    expect(errors.length).toBe(0);
  });

  it('handles nested validation errors with paths', () => {
    const schema = Baobox.Object({
      user: Baobox.Object({
        name: Baobox.String(),
        age: Baobox.Integer({ minimum: 0 }),
      }),
    });

    const errors = Array.from(ErrorsIterator(schema, { user: { name: 42, age: -1 } }));
    expect(errors.length).toBeGreaterThan(0);

    // Should have path information for nested errors
    const hasNestedPath = errors.some((e) => e.path.includes('user'));
    expect(hasNestedPath).toBe(true);
  });

  it('maps all standard codes to numeric types', () => {
    // Test a sample of code mappings
    expect(typeof ValueErrorType.INVALID_TYPE).toBe('number');
    expect(typeof ValueErrorType.MISSING_REQUIRED).toBe('number');
    expect(typeof ValueErrorType.MIN_LENGTH).toBe('number');
    expect(typeof ValueErrorType.PATTERN).toBe('number');
    expect(typeof ValueErrorType.UNION).toBe('number');
    expect(typeof ValueErrorType.CUSTOM_TYPE).toBe('number');
  });

  it('ValueError carries schema and value references', () => {
    const schema = Baobox.String();
    const value = 42;
    const errors = Array.from(ErrorsIterator(schema, value));

    for (const error of errors) {
      expect(error.schema).toBe(schema); // same reference
      expect(error.value).toBe(value); // same reference
    }
  });

  it('is accessible via Value namespace', () => {
    expect(typeof Value.ErrorsIterator).toBe('function');
  });
});

describe('AUDIT: CLI transforms edge cases', () => {
  it('handles double quotes in imports', () => {
    const result = transformImport('import { Type } from "@sinclair/typebox";');
    expect(result.changed).toBe(true);
    expect(result.line).toContain("'baobox'");
  });

  it('handles single quotes in imports', () => {
    const result = transformImport("import { Type } from '@sinclair/typebox';");
    expect(result.changed).toBe(true);
    expect(result.line).toContain("'baobox'");
  });

  it('does not transform partial matches', () => {
    const result = transformImport("import x from '@sinclair/typebox-extra';");
    expect(result.changed).toBe(false);
  });

  it('does not transform baobox imports', () => {
    const result = transformImport("import { Type } from 'baobox';");
    expect(result.changed).toBe(false);
  });

  it('detects [Kind] symbol usage', () => {
    const items = detectManualReviewItems("if (schema[Kind] === 'String') {", 1);
    expect(items.length).toBe(1);
  });

  it('detects FormatRegistry usage', () => {
    const items = detectManualReviewItems("FormatRegistry.Set('email', validator);", 1);
    expect(items.length).toBe(1);
  });

  it('does not flag normal code', () => {
    const items = detectManualReviewItems("const x = schema.properties;", 1);
    expect(items.length).toBe(0);
  });

  it('transforms TypeCompiler.Code', () => {
    const result = transformApiCalls('const code = TypeCompiler.Code(schema);');
    expect(result.changed).toBe(true);
    expect(result.line).toBe('const code = Code(schema);');
  });

  it('does not transform comment lines', () => {
    const comment = '// TypeCompiler.Compile(schema) — legacy API';
    const result = transformApiCalls(comment);
    expect(result.changed).toBe(false);
    expect(result.line).toBe(comment);
  });

  it('does not transform JSDoc comment lines', () => {
    const jsdoc = ' * TypeCompiler.Compile(schema) example usage';
    const result = transformApiCalls(jsdoc);
    expect(result.changed).toBe(false);
  });

  it('does not transform block comment lines', () => {
    const blockComment = '/* TypeCompiler.Compile(schema) */';
    const result = transformApiCalls(blockComment);
    expect(result.changed).toBe(false);
  });

  it('does not match @sinclair/typebox-utils import', () => {
    const result = transformImport("import x from '@sinclair/typebox-utils';");
    expect(result.changed).toBe(false);
  });

  it('transforms consistently across multiple consecutive calls (no /g lastIndex bug)', () => {
    // This tests the regex stateful lastIndex issue with /g flag + test()
    const lines = [
      'const a = TypeCompiler.Compile(schema1);',
      'const b = TypeCompiler.Compile(schema2);',
      'const c = TypeCompiler.Compile(schema3);',
      'const d = TypeCompiler.Compile(schema4);',
      'const e = TypeCompiler.Compile(schema5);',
    ];

    for (const line of lines) {
      const result = transformApiCalls(line);
      expect(result.changed).toBe(true);
      expect(result.line).not.toContain('TypeCompiler');
    }
  });
});
