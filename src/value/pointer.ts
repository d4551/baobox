function parsePointer(pointer: string): string[] {
  if (pointer === '') return [];
  if (!pointer.startsWith('/')) {
    throw new Error(`Invalid JSON Pointer: "${pointer}" — must start with "/" or be empty`);
  }
  return pointer
    .slice(1)
    .split('/')
    .map(token => token.replace(/~1/g, '/').replace(/~0/g, '~'));
}

function encodeToken(token: string): string {
  return token.replace(/~/g, '~0').replace(/\//g, '~1');
}

function resolve(value: unknown, tokens: string[]): { parent: unknown; key: string | number } | undefined {
  if (tokens.length === 0) return undefined;

  let current: unknown = value;
  for (let i = 0; i < tokens.length - 1; i++) {
    const token = tokens[i]!;
    if (current === null || current === undefined) return undefined;
    if (Array.isArray(current)) {
      const idx = Number(token);
      if (!Number.isFinite(idx) || idx < 0 || idx >= current.length) return undefined;
      current = current[idx];
    } else if (typeof current === 'object') {
      current = (current as Record<string, unknown>)[token];
    } else {
      return undefined;
    }
  }

  const lastToken = tokens[tokens.length - 1]!;
  if (Array.isArray(current)) {
    const idx = Number(lastToken);
    if (!Number.isFinite(idx)) return undefined;
    return { parent: current, key: idx };
  }
  if (current !== null && typeof current === 'object') {
    return { parent: current, key: lastToken };
  }
  return undefined;
}

export namespace Pointer {
  export function Get(value: unknown, pointer: string): unknown {
    const tokens = parsePointer(pointer);
    if (tokens.length === 0) return value;

    let current: unknown = value;
    for (const token of tokens) {
      if (current === null || current === undefined) return undefined;
      if (Array.isArray(current)) {
        const idx = Number(token);
        if (!Number.isFinite(idx) || idx < 0 || idx >= current.length) return undefined;
        current = current[idx];
      } else if (typeof current === 'object') {
        current = (current as Record<string, unknown>)[token];
      } else {
        return undefined;
      }
    }
    return current;
  }

  export function Set(value: unknown, pointer: string, setValue: unknown): unknown {
    const tokens = parsePointer(pointer);
    if (tokens.length === 0) return setValue;

    if (value === null || value === undefined) {
      const firstIsNumeric = /^\d+$/.test(tokens[0]!);
      value = firstIsNumeric ? [] : {};
    }

    let current: unknown = value;
    for (let i = 0; i < tokens.length - 1; i++) {
      const token = tokens[i]!;
      const nextToken = tokens[i + 1]!;
      const nextIsNumeric = /^\d+$/.test(nextToken);

      if (Array.isArray(current)) {
        const idx = Number(token);
        if (current[idx] === null || current[idx] === undefined) {
          current[idx] = nextIsNumeric ? [] : {};
        }
        current = current[idx];
      } else if (current !== null && typeof current === 'object') {
        const obj = current as Record<string, unknown>;
        if (obj[token] === null || obj[token] === undefined) {
          obj[token] = nextIsNumeric ? [] : {};
        }
        current = obj[token];
      } else {
        return value;
      }
    }

    const lastToken = tokens[tokens.length - 1]!;
    if (Array.isArray(current)) {
      const idx = Number(lastToken);
      if (Number.isFinite(idx)) {
        while (current.length <= idx) current.push(undefined);
        current[idx] = setValue;
      }
    } else if (current !== null && typeof current === 'object') {
      (current as Record<string, unknown>)[lastToken] = setValue;
    }

    return value;
  }

  export function Delete(value: unknown, pointer: string): unknown {
    const tokens = parsePointer(pointer);
    if (tokens.length === 0) return value;

    const resolved = resolve(value, tokens);
    if (resolved === undefined) return value;

    const { parent, key } = resolved;
    if (Array.isArray(parent)) {
      const idx = typeof key === 'number' ? key : Number(key);
      if (Number.isFinite(idx) && idx >= 0 && idx < parent.length) {
        parent.splice(idx, 1);
      }
    } else if (parent !== null && typeof parent === 'object') {
      delete (parent as Record<string, unknown>)[key as string];
    }

    return value;
  }

  export function Has(value: unknown, pointer: string): boolean {
    const tokens = parsePointer(pointer);
    if (tokens.length === 0) return true;

    const resolved = resolve(value, tokens);
    if (resolved === undefined) return false;

    const { parent, key } = resolved;
    if (Array.isArray(parent)) {
      const idx = typeof key === 'number' ? key : Number(key);
      return Number.isFinite(idx) && idx >= 0 && idx < parent.length;
    }
    if (parent !== null && typeof parent === 'object') {
      return (key as string) in (parent as Record<string, unknown>);
    }
    return false;
  }

  export function Create(...tokens: string[]): string {
    if (tokens.length === 0) return '';
    return '/' + tokens.map(encodeToken).join('/');
  }
}
