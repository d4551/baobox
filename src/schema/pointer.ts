import { DecodePointerToken, IsArray, IsObject } from './shared.js';

function assertNotRoot(indices: string[]): void {
  if (indices.length === 0) {
    throw new Error('Cannot set root');
  }
}

function assertIndexable(value: unknown): asserts value is Record<string, unknown> | unknown[] {
  if (!IsObject(value)) {
    throw new Error('Cannot set value');
  }
}

function hasIndex(index: string, value: unknown): boolean {
  return IsObject(value) && index in value;
}

function getIndex(index: string, value: unknown): unknown {
  return IsObject(value) ? value[index] : undefined;
}

function takeIndexRight(indices: string[]): [string[], string] {
  return [indices.slice(0, indices.length - 1), indices[indices.length - 1] ?? ''];
}

function getIndices(indices: string[], value: unknown): unknown {
  return indices.reduce<unknown>((current, index) => getIndex(index, current), value);
}

function isNumericIndex(index: string): boolean {
  return /^(0|[1-9]\d*)$/.test(index);
}

export function Indices(pointer: string): string[] {
  if (pointer.length === 0) {
    return [];
  }
  const indices = pointer.split('/').map(DecodePointerToken);
  return indices.length > 0 && indices[0] === '' ? indices.slice(1) : indices;
}

export function Has(value: unknown, pointer: string): boolean {
  let current = value;
  return Indices(pointer).every((index) => {
    if (!hasIndex(index, current)) {
      return false;
    }
    current = getIndex(index, current);
    return true;
  });
}

export function Get(value: unknown, pointer: string): unknown {
  return getIndices(Indices(pointer), value);
}

export function Set<T>(value: T, pointer: string, next: unknown): T {
  const indices = Indices(pointer);
  assertNotRoot(indices);
  const [head, index] = takeIndexRight(indices);
  const parent = getIndices(head, value);
  assertIndexable(parent);
  if (Array.isArray(parent) && isNumericIndex(index)) {
    parent[Number(index)] = next;
  } else if (IsObject(parent)) {
    parent[index] = next;
  }
  return value;
}

export function Delete<T>(value: T, pointer: string): T {
  const indices = Indices(pointer);
  assertNotRoot(indices);
  const [head, index] = takeIndexRight(indices);
  const parent = getIndices(head, value);
  assertIndexable(parent);
  if (IsArray(parent) && isNumericIndex(index)) {
    parent.splice(Number(index), 1);
  } else {
    delete (parent as Record<string, unknown>)[index];
  }
  return value;
}

export const Pointer = {
  Delete,
  Get,
  Has,
  Indices,
  Set,
};
