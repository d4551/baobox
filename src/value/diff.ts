import { Equal } from './equal.js';
import { isPlainRecord, recordKeys, recordValue } from '../shared/runtime-guards.js';

/** A structural edit operation */
export interface DiffEdit {
  type: 'insert' | 'update' | 'delete';
  path: string;
  value?: unknown;
}

/** Compute a structural delta between two values */
export function Diff(a: unknown, b: unknown): DiffEdit[] {
  const edits: DiffEdit[] = [];
  diffInternal(a, b, '', edits);
  return edits;
}

function diffInternal(a: unknown, b: unknown, path: string, edits: DiffEdit[]): void {
  if (Equal(a, b)) return;

  if (a === undefined && b !== undefined) {
    edits.push({ type: 'insert', path, value: b });
    return;
  }
  if (a !== undefined && b === undefined) {
    edits.push({ type: 'delete', path });
    return;
  }

  if (typeof a !== typeof b || a === null || b === null ||
      typeof a !== 'object' || typeof b !== 'object') {
    edits.push({ type: 'update', path, value: b });
    return;
  }

  if (Array.isArray(a) && Array.isArray(b)) {
    const maxLen = Math.max(a.length, b.length);
    for (let i = 0; i < maxLen; i++) {
      const itemPath = path ? `${path}/${i}` : `/${i}`;
      if (i >= a.length) {
        edits.push({ type: 'insert', path: itemPath, value: b[i] });
      } else if (i >= b.length) {
        edits.push({ type: 'delete', path: itemPath });
      } else {
        diffInternal(a[i], b[i], itemPath, edits);
      }
    }
    return;
  }

  if (!isPlainRecord(a) || !isPlainRecord(b)) {
    edits.push({ type: 'update', path, value: b });
    return;
  }

  const allKeys = new Set([...recordKeys(a), ...recordKeys(b)]);

  for (const key of allKeys) {
    const keyPath = path ? `${path}/${key}` : `/${key}`;
    if (!(key in a)) {
      edits.push({ type: 'insert', path: keyPath, value: recordValue(b, key) });
    } else if (!(key in b)) {
      edits.push({ type: 'delete', path: keyPath });
    } else {
      diffInternal(recordValue(a, key), recordValue(b, key), keyPath, edits);
    }
  }
}
