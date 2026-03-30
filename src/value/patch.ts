import type { DiffEdit } from './diff.js';
import { Clone } from './clone.js';
import { isPlainRecord, recordValue } from '../shared/runtime-guards.js';

/** Apply a structural delta (DiffEdit[]) to a value */
export function Patch<T>(value: T, edits: DiffEdit[]): T {
  const result = Clone(value);
  for (const edit of edits) {
    applyEdit(result, edit);
  }
  return result;
}

function applyEdit(root: unknown, edit: DiffEdit): void {
  const segments = edit.path.split('/').filter(Boolean);
  if (segments.length === 0) return;

  let current: unknown = root;
  for (let i = 0; i < segments.length - 1; i++) {
    const seg = segments[i] as string;
    if (Array.isArray(current)) {
      current = current[Number.parseInt(seg, 10)];
    } else if (isPlainRecord(current)) {
      current = recordValue(current, seg);
    } else {
      return;
    }
  }

  const lastSeg = segments[segments.length - 1] as string;
  if (Array.isArray(current)) {
    const idx = Number.parseInt(lastSeg, 10);
    switch (edit.type) {
      case 'insert':
        current.splice(idx, 0, edit.value);
        break;
      case 'update':
        current[idx] = edit.value;
        break;
      case 'delete':
        current.splice(idx, 1);
        break;
    }
  } else if (isPlainRecord(current)) {
    switch (edit.type) {
      case 'insert':
      case 'update':
        current[lastSeg] = edit.value;
        break;
      case 'delete':
        delete current[lastSeg];
        break;
    }
  }
}
