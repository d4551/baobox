import {
  Object, Array, String, Number, Integer, Union, Literal,
  Optional, Partial, Recursive, Ref,
} from '../src/index.js';
import { Check } from '../src/value/index.js';
import { Compile } from '../src/compile/index.js';
import { Parse } from '../src/value/parse.js';
import { Convert } from '../src/value/convert.js';
import { Create } from '../src/value/create.js';
import { Errors } from '../src/error/index.js';

// ---------------------------------------------------------------------------
// Schemas
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function runBench(name: string, fn: () => void, iterations = 100_000): void {
  const start = performance.now();
  for (let i = 0; i < iterations; i++) fn();
  const elapsed = performance.now() - start;
  const ops = Math.round((iterations / elapsed) * 1_000_000);
  console.log(`${name}: ${ops.toLocaleString()} ops/s (${elapsed.toFixed(2)}ms / ${iterations} iters)`);
}

// ---------------------------------------------------------------------------
// Baseline: Primitive types (Check)
// ---------------------------------------------------------------------------

console.log('\n=== Baobox Validation Benchmarks ===\n');
console.log('--- Primitive types ---');
runBench('String (unconstrained)', () => Check(String(), 'hello'));
runBench('Number (unconstrained)', () => Check(Number(), 42));
runBench('Boolean', () => Check(Boolean(), true));
runBench('Integer', () => Check(Integer(), 42));

// ---------------------------------------------------------------------------
// String constraints
// ---------------------------------------------------------------------------

console.log('\n--- String constraints ---');
runBench('String {minLength:3, maxLength:10}', () => Check(String({ minLength: 3, maxLength: 10 }), 'hello'));
runBench('String {pattern}', () => Check(String({ pattern: '^[a-z]+$' }), 'hello'));
runBench('String {format:email}', () => Check(String({ format: 'email' }), 'user@example.com'));
runBench('String {format:uuid}', () => Check(String({ format: 'uuid' }), '550e8400-e29b-41d4-a716-446655440000'));

// ---------------------------------------------------------------------------
// Number constraints
// ---------------------------------------------------------------------------

console.log('\n--- Number constraints ---');
runBench('Number {minimum:0, maximum:100}', () => Check(Number({ minimum: 0, maximum: 100 }), 42));
runBench('Integer {multipleOf:5}', () => Check(Integer({ multipleOf: 5 }), 10));

// ---------------------------------------------------------------------------
// Container types
// ---------------------------------------------------------------------------

console.log('\n--- Container types ---');
runBench('Array<String> (5 items)', () => Check(Array(String()), arrayValue));
runBench('Object (4 properties)', () => Check(simpleObject, testValue));
runBench('Nested Object', () => Check(nestedObject, nestedValue));
runBench('Object with optional', () => Check(optionalObject, { id: '1', name: 'Ada' }));

// ---------------------------------------------------------------------------
// Composite types
// ---------------------------------------------------------------------------

console.log('\n--- Composite types ---');
runBench('Union (string | number)', () => Check(unionSchema, 42));
runBench('Deep Array (3D)', () => Check(deepArray, [[1, 2], [3, 4], [5, 6]]));
runBench('Recursive (3 levels)', () => Check(recursiveSchema, recursiveValue));

// ---------------------------------------------------------------------------
// Check vs Compile (JIT compiler)
// ---------------------------------------------------------------------------

console.log('\n--- JIT Compiler: Check vs Compile ---');
const compiledSimple = Compile(simpleObject);
const compiledNested = Compile(nestedObject);
const compiledOptional = Compile(optionalObject);
const compiledUnion = Compile(unionSchema);
const compiledRecursive = Compile(recursiveSchema);

runBench('Check: Object (4 props)', () => Check(simpleObject, testValue), 100_000);
runBench('Compile: Object (4 props)', () => compiledSimple.Check(testValue), 100_000);
console.log('');
runBench('Check: Nested Object', () => Check(nestedObject, nestedValue), 100_000);
runBench('Compile: Nested Object', () => compiledNested.Check(nestedValue), 100_000);
console.log('');
runBench('Check: Union (string | number)', () => Check(unionSchema, 42), 100_000);
runBench('Compile: Union (string | number)', () => compiledUnion.Check(42), 100_000);
console.log('');
runBench('Check: Optional object', () => Check(optionalObject, { id: '1' }), 100_000);
runBench('Compile: Optional object', () => compiledOptional.Check({ id: '1' }), 100_000);
console.log('');
runBench('Check: Recursive (3 levels)', () => Check(recursiveSchema, recursiveValue), 100_000);
runBench('Compile: Recursive (3 levels)', () => compiledRecursive.Check(recursiveValue), 100_000);

// ---------------------------------------------------------------------------
// Error collection overhead
// ---------------------------------------------------------------------------

console.log('\n--- Error collection vs Check ---');
const invalidValue = { name: '', age: -1, email: 'not-an-email' };
runBench('Check (valid)', () => Check(simpleObject, testValue), 50_000);
runBench('Errors (invalid)', () => Errors(simpleObject, invalidValue), 50_000);
runBench('Check (invalid)', () => Check(simpleObject, invalidValue), 50_000);

// ---------------------------------------------------------------------------
// Value operations pipeline
// ---------------------------------------------------------------------------

console.log('\n--- Value operations ---');
runBench('Create: Object (4 props)', () => Create(simpleObject), 50_000);
runBench('Convert: Object props', () => Convert(simpleObject, { name: 1, age: '37', email: true }), 50_000);
runBench('Parse: Object (coerce)', () => Parse(simpleObject, { name: 'Ada', age: '37' }), 50_000);

// ---------------------------------------------------------------------------
// Generated code size
// ---------------------------------------------------------------------------

console.log('\n--- Generated code size ---');
console.log(`Compile Code (Object 4 props): ${compiledSimple.Code().length} chars`);
console.log(`Compile Code (Nested Object):  ${compiledNested.Code().length} chars`);
console.log(`Compile Code (Union):         ${compiledUnion.Code().length} chars`);

console.log('');
