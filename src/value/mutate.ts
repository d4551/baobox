import { isPlainRecord, recordEntries, recordKeys } from '../shared/runtime-guards.js';

/** In-place deep mutation: transfer all properties from source into target */
export function Mutate(target: unknown, source: unknown): void {
  if (Array.isArray(target) && Array.isArray(source)) {
    target.length = 0;
    for (const item of source) target.push(item);
    return;
  }

  if (!isPlainRecord(target) || !isPlainRecord(source)) return;

  for (const key of recordKeys(target)) {
    if (!(key in source)) {
      delete target[key];
    }
  }
  for (const [key, value] of recordEntries(source)) {
    target[key] = value;
  }
}
