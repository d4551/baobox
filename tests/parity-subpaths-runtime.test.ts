import { describe, expect, it } from 'bun:test';
import * as BaoboxCompileModule from '../src/compile/index.ts';
import * as BaoboxErrorModule from '../src/error/index.ts';
import * as BaoboxFormatModule from '../src/format/index.ts';
import * as BaoboxGuardModule from '../src/guard/index.ts';
import * as BaoboxSystemModule from '../src/system/index.ts';
import * as BaoboxValueModule from '../src/value/index.ts';

import * as TypeBoxCompileModule from 'typebox/compile';
import * as TypeBoxErrorModule from 'typebox/error';
import * as TypeBoxFormatModule from 'typebox/format';
import * as TypeBoxGuardModule from 'typebox/guard';
import * as TypeBoxSystemModule from 'typebox/system';
import * as TypeBoxValueModule from 'typebox/value';

function keys(value: object): string[] {
  return Object.keys(value).sort();
}

function missingKeys(source: object, target: object): string[] {
  const sourceKeys = new Set(keys(source));
  return keys(target).filter((key) => !sourceKeys.has(key));
}

describe('subpath runtime export parity', () => {
  it('matches compile export keys', () => {
    expect(keys(BaoboxCompileModule)).toEqual(keys(TypeBoxCompileModule));
  });

  it('matches error export keys', () => {
    expect(missingKeys(BaoboxErrorModule, TypeBoxErrorModule)).toEqual([]);
    expect(typeof BaoboxErrorModule.Explain).toBe('function');
  });

  it('matches format export keys', () => {
    expect(keys(BaoboxFormatModule)).toEqual(keys(TypeBoxFormatModule));
  });

  it('matches guard export keys', () => {
    expect(keys(BaoboxGuardModule)).toEqual(keys(TypeBoxGuardModule));
  });

  it('matches system export keys', () => {
    expect(keys(BaoboxSystemModule)).toEqual(keys(TypeBoxSystemModule));
  });

  it('matches value export keys', () => {
    expect(missingKeys(BaoboxValueModule, TypeBoxValueModule)).toEqual([]);
    expect(typeof BaoboxValueModule.TryParse).toBe('function');
  });
});
