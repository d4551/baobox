import { describe, expect, it } from 'bun:test';
import * as Type from '../src/index.ts';

describe('root capability helpers', () => {
  it('derives object required keys from optional modifiers', () => {
    const Schema = Type._Object_({
      id: Type.String(),
      nickname: Type.OptionalAdd(Type.String()),
    });

    expect(Type.RequiredArray(Schema.properties as Record<string, Type.TSchema>)).toEqual(['id']);
    expect(Schema.required).toEqual(['id']);
    expect(Schema.optional).toEqual(['nickname']);
  });

  it('encodes and decodes simple template literal patterns', () => {
    const encoded = Type.TemplateLiteralFromString('user-${number}') as Type.TSchema & { patterns: string[] };
    expect(encoded['~kind']).toBe('TemplateLiteral');
    expect(encoded.patterns[0]).toContain(Type.NumberPattern);

    const decoded = Type.TemplateLiteralDecode(`^${Type.IntegerPattern}$`);
    expect(decoded['~kind']).toBe('Integer');
  });

  it('builds record helpers from key patterns', () => {
    const schema = Type.RecordConstruct(Type.String(), Type.Number()) as Type.TSchema & { key: Type.TSchema; value: Type.TSchema };
    expect(Type.RecordPattern(schema as Type.TRecord)).toBe(Type.StringKey);
    expect(Type.RecordKey(schema as Type.TRecord)['~kind']).toBe('String');
    expect(Type.RecordValue(schema as Type.TRecord)['~kind']).toBe('Number');
  });

  it('compares and broadens compatible types', () => {
    expect(Type.Compare(Type.Integer(), Type.Number())).toBe(Type.ResultLeftInside);
    expect(Type.Compare(Type.String(), Type.Number())).toBe(Type.ResultDisjoint);
    expect(Type.Narrow(Type.Integer(), Type.Number())['~kind']).toBe('Integer');
    expect(Type.Broaden([Type.Integer(), Type.Number()])['~kind']).toBe('Number');
  });

  it('turns property keys into an indexer union', () => {
    const keySchema = Type.KeyOfAction(Type.Object({ 0: Type.String(), name: Type.Number() }));
    expect(keySchema['~kind']).toBe('Union');
  });

  it('converts enum-like inputs into union variants', () => {
    const values = Type.TypeScriptEnumToEnumValues({ A: 'alpha', B: 'beta', 0: 'ignore' });
    expect(values).toEqual(['alpha', 'beta']);

    const union = Type.EnumValuesToUnion(values);
    expect(union['~kind']).toBe('Union');
  });

  it('supports optional and readonly action guards', () => {
    expect(Type.IsOptionalAddAction(Type.OptionalAddAction(Type.String()))).toBe(true);
    expect(Type.IsOptionalRemoveAction(Type.OptionalRemoveAction(Type.String()))).toBe(true);
    expect(Type.IsReadonlyAddAction(Type.ReadonlyAddAction(Type.String()))).toBe(true);
    expect(Type.IsReadonlyRemoveAction(Type.ReadonlyRemoveAction(Type.String()))).toBe(true);
  });

  it('supports cyclic helper analysis', () => {
    const defs = {
      Node: Type.Object({ next: Type.Ref('Node') }),
      Leaf: Type.Object({ value: Type.String() }),
    } satisfies Record<string, Type.TSchema>;

    expect(Type.CyclicTarget(defs, 'Node')['~kind']).toBe('Object');
    expect(Type.CyclicCheck(['Node'], defs, defs.Node)).toBe(true);
    expect(Type.CyclicCandidates(defs)).toEqual(['Node']);
    expect(Type.CyclicDependencies(defs, 'Node', defs.Node)).toEqual(['Node']);
  });

  it('supports direct instantiate helpers', () => {
    const parameters = Type.ParametersInstantiate({}, { callstack: [] }, Type.Function([Type.String(), Type.Number()], Type.Boolean()));
    expect(parameters['~kind']).toBe('Tuple');

    const instance = Type.InstanceTypeInstantiate({}, { callstack: [] }, Type.Constructor([Type.String()], Type.Object({ name: Type.String() })));
    expect(instance['~kind']).toBe('Object');
  });
});
