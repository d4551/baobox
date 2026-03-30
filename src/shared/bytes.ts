import { BASE64_FORMAT } from './format-constants.js';
import { validateFormat } from './format-validators.js';

const BASE64_BLOCK_SIZE = 4;
const BYTE_BLOCK_SIZE = 3;
const BASE64_SINGLE_PADDING = '=';
const BASE64_DOUBLE_PADDING = '==';

interface BunBytesRuntime {
  readonly Bun?: {
    readonly base64ToBytes?: (input: string) => Uint8Array;
  };
}

function runtimeBun(): BunBytesRuntime['Bun'] {
  const runtime = globalThis as typeof globalThis & BunBytesRuntime;
  return runtime.Bun;
}

function toComparableBuffer(value: Uint8Array): Buffer {
  return Buffer.from(value.buffer, value.byteOffset, value.byteLength);
}

export function encodeUint8ArrayBase64(value: Uint8Array): string {
  return toComparableBuffer(value).toString(BASE64_FORMAT);
}

export function decodeUint8ArrayBase64(value: string): Uint8Array {
  const bunRuntime = runtimeBun();
  if (typeof bunRuntime?.base64ToBytes === 'function') {
    return bunRuntime.base64ToBytes(value);
  }
  return new Uint8Array(Buffer.from(value, BASE64_FORMAT));
}

export function getBase64DecodedByteLength(value: string): number {
  const padding = value.endsWith(BASE64_DOUBLE_PADDING) ? 2 : value.endsWith(BASE64_SINGLE_PADDING) ? 1 : 0;
  return ((value.length / BASE64_BLOCK_SIZE) * BYTE_BLOCK_SIZE) - padding;
}

export function areUint8ArraysEqual(left: Uint8Array, right: Uint8Array): boolean {
  if (left.byteLength !== right.byteLength) {
    return false;
  }
  if (left.byteLength === 0) {
    return true;
  }
  return Buffer.compare(toComparableBuffer(left), toComparableBuffer(right)) === 0;
}

export function isUint8ArrayWithinBounds(
  value: { byteLength: number },
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
  constBase64?: string,
): boolean {
  if (typeof value !== 'string' || !validateFormat(value, BASE64_FORMAT)) {
    return false;
  }
  if (!isUint8ArrayWithinBounds({ byteLength: getBase64DecodedByteLength(value) }, minByteLength, maxByteLength)) {
    return false;
  }
  return constBytes === undefined ? true : value === (constBase64 ?? encodeUint8ArrayBase64(constBytes));
}
