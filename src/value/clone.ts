function cloneValue<T>(value: T): T {
  return (globalThis as typeof globalThis & {
    structuredClone<U>(input: U): U;
  }).structuredClone(value);
}

/** Deep structural clone using Bun-native structuredClone */
export function Clone<T>(value: T): T {
  return cloneValue(value);
}
