import {
  Object, Array, String, Number, Integer, Union,
  Optional, Partial, Recursive,
} from '../src/index.js';
import { Check } from '../src/value/index.js';
import { Compile } from '../src/compile/index.js';
import { Parse } from '../src/value/parse.js';
import { Convert } from '../src/value/convert.js';
import { Create } from '../src/value/create.js';
import { Errors } from '../src/error/index.js';

const simpleObject = Object({
  name: String(),
  age: Number(),
  email: String(),
});

const nestedObject = Object({
  user: Object({
    name: String(),
    address: Object({
      city: String(),
      zip: String(),
    }),
  }),
  tags: Array(String()),
});

const unionSchema = Union([String(), Number()]);
const deepArray = Array(Array(Array(Number())));
const optionalObject = Partial(Object({
  id: String(),
  name: String(),
  age: Number(),
  active: Boolean(),
}));

const recursiveSchema = Recursive('Node', (Self) =>
  Object({
    value: String(),
    next: Optional(Self),
  }, { required: ['value'] }),
);

const testValue = { name: 'Ada Lovelace', age: 37, email: 'ada@example.com' };
const nestedValue = {
  user: { name: 'Ada', address: { city: 'London', zip: 'SW1A 1AA' } },
  tags: ['mathematician', 'computer'],
};
const arrayValue = ['a', 'b', 'c', 'd', 'e'];
const recursiveValue = {
  value: 'a',
  next: { value: 'b', next: { value: 'c' } },
};

function runBench(name: string, fn: () => void, iterations = 100_000): string {
  const start = performance.now();
  for (let index = 0; index < iterations; index += 1) {
    fn();
  }
  const elapsed = performance.now() - start;
  const ops = Math.round((iterations / elapsed) * 1_000_000);
  return `${name}: ${ops.toLocaleString()} ops/s (${elapsed.toFixed(2)}ms / ${iterations} iters)`;
}

const lines: string[] = [];

lines.push('', '=== Baobox Validation Benchmarks ===', '');
lines.push('--- Primitive types ---');
lines.push(runBench('String (unconstrained)', () => Check(String(), 'hello')));
lines.push(runBench('Number (unconstrained)', () => Check(Number(), 42)));
lines.push(runBench('Boolean', () => Check(Boolean(), true)));
lines.push(runBench('Integer', () => Check(Integer(), 42)));

lines.push('', '--- String constraints ---');
lines.push(runBench('String {minLength:3, maxLength:10}', () => Check(String({ minLength: 3, maxLength: 10 }), 'hello')));
lines.push(runBench('String {pattern}', () => Check(String({ pattern: '^[a-z]+$' }), 'hello')));
lines.push(runBench('String {format:email}', () => Check(String({ format: 'email' }), 'user@example.com')));
lines.push(runBench('String {format:uuid}', () => Check(String({ format: 'uuid' }), '550e8400-e29b-41d4-a716-446655440000')));

lines.push('', '--- Number constraints ---');
lines.push(runBench('Number {minimum:0, maximum:100}', () => Check(Number({ minimum: 0, maximum: 100 }), 42)));
lines.push(runBench('Integer {multipleOf:5}', () => Check(Integer({ multipleOf: 5 }), 10)));

lines.push('', '--- Container types ---');
lines.push(runBench('Array<String> (5 items)', () => Check(Array(String()), arrayValue)));
lines.push(runBench('Object (4 properties)', () => Check(simpleObject, testValue)));
lines.push(runBench('Nested Object', () => Check(nestedObject, nestedValue)));
lines.push(runBench('Object with optional', () => Check(optionalObject, { id: '1', name: 'Ada' })));

lines.push('', '--- Composite types ---');
lines.push(runBench('Union (string | number)', () => Check(unionSchema, 42)));
lines.push(runBench('Deep Array (3D)', () => Check(deepArray, [[1, 2], [3, 4], [5, 6]])));
lines.push(runBench('Recursive (3 levels)', () => Check(recursiveSchema, recursiveValue)));

lines.push('', '--- JIT Compiler: Check vs Compile ---');
const compiledSimple = Compile(simpleObject);
const compiledNested = Compile(nestedObject);
const compiledOptional = Compile(optionalObject);
const compiledUnion = Compile(unionSchema);
const compiledRecursive = Compile(recursiveSchema);

lines.push(runBench('Check: Object (4 props)', () => Check(simpleObject, testValue), 100_000));
lines.push(runBench('Compile: Object (4 props)', () => compiledSimple.Check(testValue), 100_000));
lines.push('');
lines.push(runBench('Check: Nested Object', () => Check(nestedObject, nestedValue), 100_000));
lines.push(runBench('Compile: Nested Object', () => compiledNested.Check(nestedValue), 100_000));
lines.push('');
lines.push(runBench('Check: Union (string | number)', () => Check(unionSchema, 42), 100_000));
lines.push(runBench('Compile: Union (string | number)', () => compiledUnion.Check(42), 100_000));
lines.push('');
lines.push(runBench('Check: Optional object', () => Check(optionalObject, { id: '1' }), 100_000));
lines.push(runBench('Compile: Optional object', () => compiledOptional.Check({ id: '1' }), 100_000));
lines.push('');
lines.push(runBench('Check: Recursive (3 levels)', () => Check(recursiveSchema, recursiveValue), 100_000));
lines.push(runBench('Compile: Recursive (3 levels)', () => compiledRecursive.Check(recursiveValue), 100_000));

lines.push('', '--- Error collection vs Check ---');
const invalidValue = { name: '', age: -1, email: 'not-an-email' };
lines.push(runBench('Check (valid)', () => Check(simpleObject, testValue), 50_000));
lines.push(runBench('Errors (invalid)', () => Errors(simpleObject, invalidValue), 50_000));
lines.push(runBench('Check (invalid)', () => Check(simpleObject, invalidValue), 50_000));

lines.push('', '--- Value operations ---');
lines.push(runBench('Create: Object (4 props)', () => Create(simpleObject), 50_000));
lines.push(runBench('Convert: Object props', () => Convert(simpleObject, { name: 1, age: '37', email: true }), 50_000));
lines.push(runBench('Parse: Object (coerce)', () => Parse(simpleObject, { name: 'Ada', age: '37' }), 50_000));

lines.push('', '--- Generated code size ---');
lines.push(`Compile Code (Object 4 props): ${compiledSimple.Code().length} chars`);
lines.push(`Compile Code (Nested Object):  ${compiledNested.Code().length} chars`);
lines.push(`Compile Code (Union):         ${compiledUnion.Code().length} chars`);
lines.push('');

await Bun.write(Bun.stdout, `${lines.join('\n')}\n`);
