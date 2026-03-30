export interface CodecShape {
  decode?: (input: unknown) => unknown;
  encode?: (input: unknown) => unknown;
}

/** @internal Structural object guard */
export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

/** @internal Plain-record guard that excludes arrays */
export function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return isRecord(value) && !Array.isArray(value);
}

/** @internal Safe object entry iteration for unknown inputs */
export function recordEntries(value: unknown): Array<[string, unknown]> {
  return isPlainRecord(value) ? Object.entries(value) : [];
}

/** @internal Safe object key iteration for unknown inputs */
export function recordKeys(value: unknown): string[] {
  return isPlainRecord(value) ? Object.keys(value) : [];
}

/** @internal Safe record lookup for unknown inputs */
export function recordValue(value: unknown, key: string): unknown {
  return isPlainRecord(value) ? value[key] : undefined;
}

/** @internal Clone a plain record or return an empty one */
export function cloneRecord(value: unknown): Record<string, unknown> {
  return isPlainRecord(value) ? { ...value } : {};
}

/** @internal Delete a key from a plain record when possible */
export function deleteRecordKey(value: unknown, key: string): boolean {
  if (!isPlainRecord(value)) {
    return false;
  }
  return delete value[key];
}

/** @internal Structural codec guard shared by encode/decode paths */
export function isCodecShape(value: unknown): value is CodecShape {
  return isPlainRecord(value)
    && (value.decode === undefined || typeof value.decode === 'function')
    && (value.encode === undefined || typeof value.encode === 'function');
}

/** @internal PromiseLike structural type guard */
export function isPromiseLike(value: unknown): value is PromiseLike<unknown> {
  return (typeof value === 'object' || typeof value === 'function')
    && value !== null
    && 'then' in value
    && typeof value.then === 'function';
}

/** @internal Iterator structural type guard */
export function isIteratorLike(value: unknown): value is Iterator<unknown> {
  return typeof value === 'object'
    && value !== null
    && 'next' in value
    && typeof value.next === 'function'
    && Symbol.iterator in value
    && typeof value[Symbol.iterator] === 'function';
}

/** @internal AsyncIterator structural type guard */
export function isAsyncIteratorLike(value: unknown): value is AsyncIterator<unknown> {
  return typeof value === 'object'
    && value !== null
    && 'next' in value
    && typeof value.next === 'function'
    && Symbol.asyncIterator in value
    && typeof value[Symbol.asyncIterator] === 'function';
}
