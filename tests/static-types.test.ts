import type {
  Static,
  StaticParse,
  TIntersect,
  TObject,
  TString,
  TNumber,
  TUnion,
} from '../src/index.ts';

type Equal<A, B> =
  (<T>() => T extends A ? 1 : 2) extends
  (<T>() => T extends B ? 1 : 2)
    ? true
    : false;

type Expect<T extends true> = T;

type IntersectAB = TIntersect<[TObject<{ a: TString }>, TObject<{ b: TNumber }>]>
type ResultIntersectAB = Static<IntersectAB>
type _AssertIntersectAB = Expect<Equal<ResultIntersectAB, { a: string; b: number }>>;

type IntersectTriple = TIntersect<[TObject<{ x: TString }>, TObject<{ y: TNumber }>, TObject<{ z: TNumber }>]>
type ResultIntersectTriple = Static<IntersectTriple>
type _AssertIntersectTriple = Expect<Equal<ResultIntersectTriple, { x: string; y: number; z: number }>>;

type UnionOfObjects = TUnion<[TObject<{ a: TString }>, TObject<{ b: TNumber }>]>
type _AssertUnion = UnionOfObjects extends TUnion<infer V> ? V : never;
type _AssertUnionShape = Expect<Equal<_AssertUnion, [TObject<{ a: TString }>, TObject<{ b: TNumber }>]>>;

type ParsedIntersect = StaticParse<IntersectAB>
type _AssertParsedIntersect = Expect<Equal<ParsedIntersect, { a: string; b: number }>>;

export {};
