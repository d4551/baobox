import type {
  Static,
  TIntersect,
  TObject,
  TString,
  TNumber,
  TUnion,
} from '../src/index.ts';

type IntersectAB = TIntersect<[TObject<{ a: TString }>, TObject<{ b: TNumber }>]>;
type ResultIntersectAB = Static<IntersectAB>;
const _assertIntersectAB: { a: string; b: number } = {} as ResultIntersectAB;

type IntersectTriple = TIntersect<[TObject<{ x: TString }>, TObject<{ y: TNumber }>, TObject<{ z: TNumber }>]>;
type ResultIntersectTriple = Static<IntersectTriple>;
const _assertIntersectTriple: { x: string; y: number; z: number } = {} as ResultIntersectTriple;

type UnionOfObjects = TUnion<[TObject<{ a: TString }>, TObject<{ b: TNumber }>]>;
type _AssertUnion = UnionOfObjects extends TUnion<infer V> ? V : never;
const _unionVariantCheck: [TObject<{ a: TString }>, TObject<{ b: TNumber }>] = {} as _AssertUnion;
