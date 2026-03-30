import type {
  ParseResult,
  Static,
  StaticParse,
  TIntersect,
  TObject,
  TString,
  TNumber,
  TUnion,
} from '../src/index.ts';
import { Clean, Compile, Convert, Create, Default, Number, Object, Parse, Repair, String, TryParse, Uint8ArrayCodec } from '../src/index.ts';
import * as Schema from '../src/schema/index.ts';
import { Decode as ValueDecode, Encode as ValueEncode } from '../src/value/index.ts';

type Root = typeof import('../src/index.ts');
type ExpectExtends<Actual extends Expected, Expected> = true;

type IntersectAB = TIntersect<[
  TObject<{ a: TString }, 'a'>,
  TObject<{ b: TNumber }, 'b'>,
]>;
type ResultIntersectAB = Static<IntersectAB>;
type _AssertIntersectAB = ExpectExtends<ResultIntersectAB, { a: string; b: number }>;

type IntersectTriple = TIntersect<[
  TObject<{ x: TString }, 'x'>,
  TObject<{ y: TNumber }, 'y'>,
  TObject<{ z: TNumber }, 'z'>,
]>;
type ResultIntersectTriple = Static<IntersectTriple>;
type _AssertIntersectTriple = ExpectExtends<ResultIntersectTriple, { x: string; y: number; z: number }>;

type UnionOfObjects = TUnion<[
  TObject<{ a: TString }, 'a'>,
  TObject<{ b: TNumber }, 'b'>,
]>;
type UnionVariants = UnionOfObjects extends TUnion<infer V> ? V : never;
type _AssertUnionVariants = ExpectExtends<UnionVariants, [
  TObject<{ a: TString }, 'a'>,
  TObject<{ b: TNumber }, 'b'>,
]>;

type ParsedIntersect = StaticParse<IntersectAB>;
type _AssertParsedIntersect = ExpectExtends<ParsedIntersect, { a: string; b: number }>;

const User: TObject<{ name: TString; age: TNumber }, 'name' | 'age'> = Object({
  name: String(),
  age: Number(),
}, { required: ['name', 'age'] });

const createdUser = Create(User);
type _AssertCreateReturn = ExpectExtends<typeof createdUser, { name: string; age: number }>;

const defaultedUser = Default(User, { name: 'Ada', age: 37 });
type _AssertDefaultReturn = ExpectExtends<typeof defaultedUser, { name: string; age: number }>;

const cleanedUser = Clean(User, { name: 'Ada', age: 37, extra: true });
type _AssertCleanReturn = ExpectExtends<typeof cleanedUser, { name: string; age: number }>;

const convertedUser = Convert(User, { name: 'Ada', age: '37' });
type _AssertConvertReturn = ExpectExtends<typeof convertedUser, { name: string; age: number }>;

const parsedUser = Parse(User, { name: 'Ada', age: 37 });
type _AssertParseReturn = ExpectExtends<typeof parsedUser, { name: string; age: number }>;

const repairedUser = Repair(User, { name: 'Ada' });
type _AssertRepairReturn = ExpectExtends<typeof repairedUser, { name: string; age: number }>;

const tryParsedUser = TryParse(User, { name: 'Ada', age: 37 });
type _AssertTryParseReturn = ExpectExtends<typeof tryParsedUser, ParseResult<{ name: string; age: number }>>;

const compiledUser = Compile(User);
const compiledDefaultUser = compiledUser.Default({ name: 'Ada', age: 37 });
type _AssertCompiledDefaultReturn = ExpectExtends<typeof compiledDefaultUser, { name: string; age: number }>;

const compiledCleanUser = compiledUser.Clean({ name: 'Ada', age: 37, extra: true });
type _AssertCompiledCleanReturn = ExpectExtends<typeof compiledCleanUser, { name: string; age: number }>;

const compiledConvertedUser = compiledUser.Convert({ name: 'Ada', age: '37' });
type _AssertCompiledConvertReturn = ExpectExtends<typeof compiledConvertedUser, { name: string; age: number }>;

const compiledParsedUser = compiledUser.Parse({ name: 'Ada', age: 37 });
type _AssertCompiledParseReturn = ExpectExtends<typeof compiledParsedUser, { name: string; age: number }>;

const compiledTryParsedUser = compiledUser.TryParse({ name: 'Ada', age: 37 });
type _AssertCompiledTryParseReturn = ExpectExtends<typeof compiledTryParsedUser, ParseResult<{ name: string; age: number }>>;

const Binary = Uint8ArrayCodec();
const decodedBinary = ValueDecode(Binary, 'AQI=');
type _AssertDecodeReturn = ExpectExtends<typeof decodedBinary, Uint8Array>;

const encodedBinary = ValueEncode(Binary, new Uint8Array([1, 2]));
type _AssertEncodeReturn = ExpectExtends<typeof encodedBinary, string>;

const compiledBinary = Compile(Binary);
const compiledDecodedBinary = compiledBinary.Decode('AQI=');
type _AssertCompiledDecodeReturn = ExpectExtends<typeof compiledDecodedBinary, Uint8Array>;

const compiledEncodedBinary = compiledBinary.Encode(new Uint8Array([1, 2]));
type _AssertCompiledEncodeReturn = ExpectExtends<typeof compiledEncodedBinary, string>;

const RawUser = {
  type: 'object',
  properties: {
    name: { type: 'string' },
    age: { type: 'number' },
  },
  required: ['name', 'age'],
} as const;

const rawParsedUser = Schema.Parse(RawUser, { name: 'Ada', age: 37 });
type _AssertRawParseReturn = ExpectExtends<typeof rawParsedUser, { name: string; age: number }>;

const rawTryParsedUser = Schema.TryParse(RawUser, { name: 'Ada', age: 37 });
type _AssertRawTryParseReturn = ExpectExtends<typeof rawTryParsedUser, ParseResult<{ name: string; age: number }>>;

type _AssertDeferredKey = Root['AwaitedDeferred'];
type _AssertDeferredGuardKey = Root['IsDeferred'];
type _AssertInstantiateKey = Root['AwaitedInstantiate'];
type _AssertKeyOfImmediateKey = Root['KeyOfImmediate'];
type _AssertRecordConstructKey = Root['RecordConstruct'];
type _AssertTemplateEncodeKey = Root['TemplateLiteralEncode'];
type _AssertTemplateDecodeKey = Root['TemplateLiteralDecode'];
type _AssertCompareKey = Root['Compare'];
type _AssertFlattenKey = Root['Flatten'];
type _AssertModifierActionKey = Root['OptionalAddAction'];
type _AssertActionGuardKey = Root['IsOptionalAddAction'];
type _AssertCyclicKey = Root['InstantiateCyclic'];
type _AssertInternalFunctionKey = Root['_Function_'];
type _AssertInternalObjectKey = Root['_Object_'];

export {};
