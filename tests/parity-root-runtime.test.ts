import { describe, expect, it } from 'bun:test';
import * as BaoboxRoot from '../src/index.ts';
import BaoboxType from '../src/index.ts';
import * as TypeBoxRoot from 'typebox';
import TypeBoxType from 'typebox';

function missingKeys(source: Record<string, unknown>, target: Record<string, unknown>): string[] {
  return Object.keys(source).filter((key) => !(key in target)).sort();
}

describe('root runtime parity', () => {
  it('keeps upstream root exports as a subset of baobox root exports', () => {
    expect(missingKeys(TypeBoxRoot, BaoboxRoot)).toEqual([]);
  });

  it('keeps upstream default namespace exports as a subset of baobox default namespace exports', () => {
    expect(missingKeys(TypeBoxType, BaoboxType)).toEqual([]);
  });

  it('exposes the deferred helper family', () => {
    const names = [
      'Deferred',
      'AwaitedDeferred',
      'ConditionalDeferred',
      'InterfaceDeferred',
      'MappedDeferred',
      'ModuleDeferred',
      'OptionsDeferred',
      'RecordDeferred',
      'TemplateLiteralDeferred',
      'IsDeferred',
      'IsInterfaceDeferred',
    ] as const;

    for (const name of names) {
      expect(name in BaoboxRoot).toBe(true);
      expect(name in BaoboxType).toBe(true);
    }
  });

  it('exposes the instantiate helper family', () => {
    const names = [
      'AwaitedInstantiate',
      'ConditionalInstantiate',
      'EvaluateInstantiate',
      'InstanceTypeImmediate',
      'InstanceTypeInstantiate',
      'InstantiateCyclic',
      'KeyOfImmediate',
      'KeyOfInstantiate',
      'MappedInstantiate',
      'OptionsInstantiate',
      'PickInstantiate',
      'RecordInstantiate',
      'RefInstantiate',
      'TemplateLiteralInstantiate',
    ] as const;

    for (const name of names) {
      expect(name in BaoboxRoot).toBe(true);
      expect(name in BaoboxType).toBe(true);
    }
  });

  it('exposes constants, patterns, and root guard helpers', () => {
    const names = [
      'ArrayOptions',
      'BigIntPattern',
      'Compare',
      'ConvertToIntegerKey',
      'Flatten',
      'IntegerKey',
      'IntegerPattern',
      'IsLiteralBigInt',
      'IsLiteralBoolean',
      'IsLiteralNumber',
      'IsLiteralString',
      'IsLiteralValue',
      'IsOptionalAddAction',
      'IsOptionalRemoveAction',
      'IsReadonlyAddAction',
      'IsReadonlyRemoveAction',
      'IsTemplateLiteralFinite',
      'IsTemplateLiteralPattern',
      'IsTypeScriptEnumLike',
      'NumberKey',
      'NumberPattern',
      'ResultDisjoint',
      'ResultEqual',
      'ResultLeftInside',
      'ResultRightInside',
      'StringKey',
      'StringPattern',
    ] as const;

    for (const name of names) {
      expect(name in BaoboxRoot).toBe(true);
      expect(name in BaoboxType).toBe(true);
    }
  });
});
