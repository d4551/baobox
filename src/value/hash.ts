/** FNV-1a hash of a value's deep structure, returning a bigint */
export function Hash(value: unknown): bigint {
  let h = 0xcbf29ce484222325n;
  hashValue(value);
  return h;

  function mix(b: bigint): void {
    h ^= b & 0xffn;
    h = BigInt.asUintN(64, h * 0x100000001b3n);
  }

  function hashString(s: string): void {
    for (let i = 0; i < s.length; i++) {
      mix(BigInt(s.charCodeAt(i)));
    }
  }

  function hashValue(v: unknown): void {
    if (v === null) { mix(0n); return; }
    if (v === undefined) { mix(1n); return; }

    switch (typeof v) {
      case 'boolean':
        mix(v ? 2n : 3n);
        return;
      case 'number':
        mix(4n);
        hashString(v.toString());
        return;
      case 'bigint':
        mix(5n);
        hashString(v.toString());
        return;
      case 'string':
        mix(6n);
        hashString(v);
        return;
      case 'symbol':
        mix(7n);
        hashString(v.toString());
        return;
      case 'object': {
        if (Array.isArray(v)) {
          mix(8n);
          for (const item of v) hashValue(item);
          return;
        }
        if (v instanceof globalThis.Date) {
          mix(9n);
          hashString(v.toISOString());
          return;
        }
        if (v instanceof globalThis.Uint8Array) {
          mix(10n);
          for (const byte of v) mix(BigInt(byte));
          return;
        }
        mix(11n);
        const keys = Object.keys(v as Record<string, unknown>).sort();
        for (const key of keys) {
          hashString(key);
          hashValue((v as Record<string, unknown>)[key]);
        }
        return;
      }
      default:
        mix(12n);
    }
  }
}
