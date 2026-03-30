/** In-place deep mutation: transfer all properties from source into target */
export function Mutate(target: unknown, source: unknown): void {
  if (typeof target !== 'object' || target === null) return;
  if (typeof source !== 'object' || source === null) return;

  if (Array.isArray(target) && Array.isArray(source)) {
    target.length = 0;
    for (const item of source) target.push(item);
    return;
  }

  const t = target as Record<string, unknown>;
  const s = source as Record<string, unknown>;

  for (const key of Object.keys(t)) {
    if (!(key in s)) {
      delete t[key];
    }
  }
  for (const [key, val] of Object.entries(s)) {
    t[key] = val;
  }
}
