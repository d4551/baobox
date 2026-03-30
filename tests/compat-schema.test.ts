import { describe, expect, test } from 'bun:test';
import * as B from '../src/index.ts';
import { To, Schema as SchemaEmitter } from '../src/schema/index.ts';

const {
  Array,
  Conditional,
  CreditCard,
  Enum,
  Evaluate,
  Exclude,
  Extract,
  IfThenElse,
  Index,
  Integer,
  Intersect,
  Ip,
  Literal,
  Mapped,
  Not,
  Null,
  Number,
  Object,
  Omit,
  Optional,
  Pick,
  Recursive,
  String,
  Uint8Array,
  Union,
} = B;

describe('compat schema emission', () => {
  test('String emits type string', () => {
    expect(To(String()).type).toBe('string');
  });

  test('Number emits type number', () => {
    expect(To(Number()).type).toBe('number');
  });

  test('Integer emits type integer', () => {
    expect(To(Integer()).type).toBe('integer');
  });

  test('Null emits type null', () => {
    expect(To(Null()).type).toBe('null');
  });

  test('Literal emits const', () => {
    expect(To(Literal('hello')).const).toBe('hello');
  });

  test('Array emits array type with items', () => {
    const result = To(Array(String()));
    expect(result.type).toBe('array');
    expect(result.items).toEqual({ type: 'string' });
  });

  test('Object emits object type with properties', () => {
    const result = To(Object({ name: String(), age: Number() }));
    expect(result.type).toBe('object');
    expect(result.properties?.name.type).toBe('string');
    expect(result.properties?.age.type).toBe('number');
  });

  test('Record emits propertyNames from key schema', () => {
    const result = To(B.Record(String({ pattern: '^item-' }), Number()));
    expect(result.type).toBe('object');
    expect(result.propertyNames).toEqual({ type: 'string', pattern: '^item-' });
    expect(result.additionalProperties).toEqual({ type: 'number' });
  });

  test('Uint8Array emits base64 string schema with comment', () => {
    const result = To(Uint8Array({ minByteLength: 2, maxByteLength: 4 }));
    expect(result.type).toBe('string');
    expect(result.contentEncoding).toBe('base64');
  });

  test('Pick preserves original required keys', () => {
    const result = To(Pick(Object({ name: String(), age: Number() }, { required: ['name'] }), ['name']));
    expect(result.required).toEqual(['name']);
  });

  test('Omit preserves remaining required keys', () => {
    const result = To(Omit(Object({ name: String(), age: Number() }, { required: ['name', 'age'] }), ['age']));
    expect(result.required).toEqual(['name']);
  });

  test('Conditional emits then as anyOf', () => {
    const result = To(Conditional(String({ minLength: 3 }), [Literal('foo'), Literal('bar')], Number()));
    expect(result.then).toEqual({ anyOf: [{ const: 'foo' }, { const: 'bar' }] });
  });

  test('Index emits anyOf from matching properties', () => {
    const result = To(Index(Object({ name: String(), age: Number() })));
    expect(result.anyOf).toEqual([{ type: 'string' }, { type: 'number' }]);
  });

  test('Mapped emits like the source object', () => {
    const result = To(Mapped(Object({ name: String() }, { required: ['name'], additionalProperties: false })));
    expect(result.type).toBe('object');
    expect(result.required).toEqual(['name']);
    expect(result.additionalProperties).toBe(false);
  });

  test('Union emits anyOf', () => {
    const result = To(Union([String(), Number()]));
    expect(result.anyOf?.length).toBe(2);
  });

  test('Intersect emits allOf', () => {
    expect(To(Intersect([Object({ name: String() }), Object({ age: Number() })])).allOf).toBeTruthy();
  });

  test('Evaluate emits flattened object schema', () => {
    const result = To(Evaluate(Intersect([
      Object({ name: String() }, { required: ['name'] }),
      Object({ age: Number() }, { optional: ['age'], additionalProperties: false }),
    ])));
    expect(result.type).toBe('object');
    expect(result.required).toEqual(['name']);
    expect(result.additionalProperties).toBe(false);
  });

  test('Enum emits string enum', () => {
    const result = To(Enum(['a', 'b', 'c']));
    expect(result.type).toBe('string');
    expect(result.enum).toEqual(['a', 'b', 'c']);
  });

  test('Exclude emits allOf with not', () => {
    const result = To(Exclude(Union([String(), Number()]), String()));
    expect(result.allOf).toEqual([
      { anyOf: [{ type: 'string' }, { type: 'number' }] },
      { not: { type: 'string' } },
    ]);
  });

  test('Extract emits allOf', () => {
    const result = To(Extract(Union([String(), Number()]), String()));
    expect(result.allOf).toEqual([
      { anyOf: [{ type: 'string' }, { type: 'number' }] },
      { type: 'string' },
    ]);
  });

  test('Recursive emits definitions and refs', () => {
    const schema = Recursive('Node', (self) =>
      Object({ value: String(), next: Optional(self) }, { required: ['value'] }),
    );
    const result = SchemaEmitter(schema);
    expect(result.schema).toEqual({ $ref: '#/definitions/Node' });
    expect(result.definitions.Node).toBeTruthy();
  });

  test('IfThenElse emits if/then/else', () => {
    const result = To(IfThenElse(String({ minLength: 5 }), Number(), Object({ error: String() })));
    expect(result.if).toBeTruthy();
    expect(result.then).toBeTruthy();
    expect(result.else).toBeTruthy();
  });

  test('Ip emits string schema with ip format', () => {
    const result = To(Ip());
    expect(result.type).toBe('string');
    expect(result.format).toBe('ip');
  });

  test('Schema returns schema and definitions object', () => {
    const result = SchemaEmitter(Object({ name: String() }));
    expect(result.schema).toEqual({ type: 'object', properties: { name: { type: 'string' } } });
    expect(result.definitions).toEqual({});
  });

  test('Credit card builder still emits a formatted string schema', () => {
    const result = To(CreditCard());
    expect(result.type).toBe('string');
    expect(result.format).toBe('creditcard');
  });
});
