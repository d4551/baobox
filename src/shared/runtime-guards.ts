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
