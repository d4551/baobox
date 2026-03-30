/** FNV-1a hash of a value's deep structure, returning a bigint */
import { isPlainRecord, recordKeys, recordValue } from '../shared/runtime-guards.js';

const FNV_64_OFFSET_BASIS = 0xcbf29ce484222325n;
const FNV_64_PRIME = 0x100000001b3n;
const FNV_64_BITS = 64;
const HASH_BYTE_MASK = 0xffn;

const HASH_TAG = {
  Null: 0n,
  Undefined: 1n,
  BooleanTrue: 2n,
  BooleanFalse: 3n,
  Number: 4n,
  BigInt: 5n,
  String: 6n,
  Symbol: 7n,
  Array: 8n,
  Date: 9n,
  Uint8Array: 10n,
  Object: 11n,
  Other: 12n,
} as const;

export function Hash(value: unknown): bigint {
  let h = FNV_64_OFFSET_BASIS;
  hashValue(value);
  return h;

  function mix(b: bigint): void {
    h ^= b & HASH_BYTE_MASK;
    h = BigInt.asUintN(FNV_64_BITS, h * FNV_64_PRIME);
  }

  function hashString(s: string): void {
    for (let i = 0; i < s.length; i++) {
      mix(BigInt(s.charCodeAt(i)));
    }
  }

  function hashValue(v: unknown): void {
    if (v === null) { mix(HASH_TAG.Null); return; }
    if (v === undefined) { mix(HASH_TAG.Undefined); return; }

    switch (typeof v) {
      case 'boolean':
        mix(v ? HASH_TAG.BooleanTrue : HASH_TAG.BooleanFalse);
        return;
      case 'number':
        mix(HASH_TAG.Number);
        hashString(v.toString());
        return;
      case 'bigint':
        mix(HASH_TAG.BigInt);
        hashString(v.toString());
        return;
      case 'string':
        mix(HASH_TAG.String);
        hashString(v);
        return;
      case 'symbol':
        mix(HASH_TAG.Symbol);
        hashString(v.toString());
        return;
      case 'object': {
        if (Array.isArray(v)) {
          mix(HASH_TAG.Array);
          for (const item of v) hashValue(item);
          return;
        }
        if (v instanceof globalThis.Date) {
          mix(HASH_TAG.Date);
          hashString(v.toISOString());
          return;
        }
        if (v instanceof globalThis.Uint8Array) {
          mix(HASH_TAG.Uint8Array);
          for (const byte of v) mix(BigInt(byte));
          return;
        }
        if (!isPlainRecord(v)) {
          mix(HASH_TAG.Other);
          return;
        }
        mix(HASH_TAG.Object);
        const keys = recordKeys(v).sort();
        for (const key of keys) {
          hashString(key);
          hashValue(recordValue(v, key));
        }
        return;
      }
      default:
        mix(HASH_TAG.Other);
    }
  }
}
