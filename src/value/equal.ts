/** Deep structural equality comparison */
export function Equal(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (a === null || b === null) return false;
  if (typeof a !== typeof b) return false;

  if (typeof a === 'bigint') return a === b;

  if (a instanceof globalThis.Date && b instanceof globalThis.Date) {
    return a.getTime() === (b as globalThis.Date).getTime();
  }

  if (a instanceof globalThis.Uint8Array && b instanceof globalThis.Uint8Array) {
    if (a.length !== (b as globalThis.Uint8Array).length) return false;
    for (let i = 0; i < a.length; i++) {
      if (a[i] !== (b as globalThis.Uint8Array)[i]) return false;
    }
    return true;
  }

  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (!Equal(a[i], b[i])) return false;
    }
    return true;
  }

  if (typeof a === 'object' && typeof b === 'object') {
    const aObj = a as Record<string, unknown>;
    const bObj = b as Record<string, unknown>;
    const aKeys = Object.keys(aObj);
    const bKeys = Object.keys(bObj);
    if (aKeys.length !== bKeys.length) return false;
    for (const key of aKeys) {
      if (!Equal(aObj[key], bObj[key])) return false;
    }
    return true;
  }

  return false;
}
