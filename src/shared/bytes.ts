import { validateFormat } from './format-validators.js';
import { dlopen, ptr } from 'bun:ffi';

const libcPath = process.platform === 'darwin'
  ? '/usr/lib/libSystem.B.dylib'
  : process.platform === 'linux'
    ? 'libc.so.6'
    : process.platform === 'win32'
      ? 'msvcrt.dll'
      : '';

const memcmp = libcPath === ''
  ? undefined
  : dlopen(libcPath, {
      memcmp: {
        args: ['ptr', 'ptr', 'usize'],
        returns: 'i32',
      },
    }).symbols.memcmp;

export function encodeUint8ArrayBase64(value: Uint8Array): string {
  return Buffer.from(value.buffer, value.byteOffset, value.byteLength).toString('base64');
}

export function decodeUint8ArrayBase64(value: string): Uint8Array {
  const bunWithBase64 = Bun as typeof Bun & { base64ToBytes?: (input: string) => Uint8Array };
  if (typeof bunWithBase64.base64ToBytes === 'function') {
    return bunWithBase64.base64ToBytes(value);
  }
  return new Uint8Array(Buffer.from(value, 'base64'));
}

export function areUint8ArraysEqual(left: Uint8Array, right: Uint8Array): boolean {
  if (left.byteLength !== right.byteLength) {
    return false;
  }
  if (left.byteLength === 0) {
    return true;
  }
  if (memcmp !== undefined) {
    return memcmp(ptr(left), ptr(right), left.byteLength) === 0;
  }
  for (let index = 0; index < left.length; index += 1) {
    if (left[index] !== right[index]) {
      return false;
    }
  }
  return true;
}

export function isUint8ArrayWithinBounds(
  value: Uint8Array,
  minByteLength?: number,
  maxByteLength?: number,
): boolean {
  if (minByteLength !== undefined && value.byteLength < minByteLength) return false;
  return maxByteLength === undefined || value.byteLength <= maxByteLength;
}

export function isUint8ArrayBase64String(
  value: unknown,
  minByteLength?: number,
  maxByteLength?: number,
  constBytes?: Uint8Array,
  bytesEqual?: (left: Uint8Array, right: Uint8Array) => boolean,
): boolean {
  if (typeof value !== 'string' || !validateFormat(value, 'base64')) {
    return false;
  }
  const decoded = decodeUint8ArrayBase64(value);
  if (!isUint8ArrayWithinBounds(decoded, minByteLength, maxByteLength)) {
    return false;
  }
  return constBytes === undefined || (bytesEqual ? bytesEqual(decoded, constBytes) : areUint8ArraysEqual(decoded, constBytes));
}
