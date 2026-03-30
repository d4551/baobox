function isAsciiDigit(value: string): boolean {
  return value >= '0' && value <= '9';
}

function consumeRegexQuantifier(pattern: string, start: number): number {
  let index = start;
  const first = pattern[index];
  if (first === undefined || !isAsciiDigit(first)) {
    return -1;
  }
  while (index < pattern.length) {
    const character = pattern[index];
    if (character === undefined || !isAsciiDigit(character)) {
      break;
    }
    index += 1;
  }
  if (pattern[index] === ',') {
    index += 1;
    while (index < pattern.length) {
      const character = pattern[index];
      if (character === undefined || !isAsciiDigit(character)) {
        break;
      }
      index += 1;
    }
  }
  return pattern[index] === '}' ? index : -1;
}

/** @internal Check if a string is a valid regular expression */
export function isValidRegex(value: string): boolean {
  let escaped = false;
  let inCharacterClass = false;
  let groupDepth = 0;
  let hasToken = false;
  let groupPrefixAllowed = false;

  for (let index = 0; index < value.length; index += 1) {
    const character = value[index];
    if (character === undefined) return false;
    if (escaped) {
      escaped = false;
      hasToken = true;
      groupPrefixAllowed = false;
      continue;
    }
    if (character === '\\') {
      escaped = true;
      continue;
    }
    if (inCharacterClass) {
      if (character === ']') {
        inCharacterClass = false;
        hasToken = true;
      }
      continue;
    }
    if (groupPrefixAllowed && character === '?') {
      groupPrefixAllowed = false;
      continue;
    }
    groupPrefixAllowed = false;

    switch (character) {
      case '[':
        inCharacterClass = true;
        hasToken = true;
        break;
      case '(':
        groupDepth += 1;
        hasToken = false;
        groupPrefixAllowed = true;
        break;
      case ')':
        if (groupDepth === 0) return false;
        groupDepth -= 1;
        hasToken = true;
        break;
      case '{': {
        if (!hasToken) return false;
        const quantifierEnd = consumeRegexQuantifier(value, index + 1);
        if (quantifierEnd < 0) return false;
        index = quantifierEnd;
        hasToken = true;
        break;
      }
      case '*':
      case '+':
      case '?':
        if (!hasToken) return false;
        hasToken = true;
        break;
      case ']':
      case '}':
        return false;
      case '|':
        hasToken = false;
        break;
      default:
        hasToken = true;
        break;
    }
  }

  return !escaped && !inCharacterClass && groupDepth === 0;
}

interface JsonState {
  index: number;
  text: string;
}

function skipWhitespace(state: JsonState): void {
  while (state.index < state.text.length) {
    const character = state.text[state.index];
    if (character !== ' ' && character !== '\n' && character !== '\r' && character !== '\t') {
      break;
    }
    state.index += 1;
  }
}

function consumeLiteral(state: JsonState, literal: string): boolean {
  if (state.text.slice(state.index, state.index + literal.length) !== literal) {
    return false;
  }
  state.index += literal.length;
  return true;
}

function parseString(state: JsonState): boolean {
  if (state.text[state.index] !== '"') return false;
  state.index += 1;
  while (state.index < state.text.length) {
    const character = state.text[state.index];
    if (character === undefined) return false;
    if (character === '"') {
      state.index += 1;
      return true;
    }
    if (character === '\\') {
      const escape = state.text[state.index + 1];
      if (escape === undefined) return false;
      if (escape === 'u') {
        for (let offset = 2; offset < 6; offset += 1) {
          const hex = state.text[state.index + offset];
          if (hex === undefined || !/[0-9a-fA-F]/.test(hex)) return false;
        }
        state.index += 6;
        continue;
      }
      if (!'"\\/bfnrt'.includes(escape)) return false;
      state.index += 2;
      continue;
    }
    if (character < ' ') return false;
    state.index += 1;
  }
  return false;
}

function parseNumber(state: JsonState): boolean {
  const start = state.index;
  if (state.text[state.index] === '-') {
    state.index += 1;
  }
  const firstDigit = state.text[state.index];
  if (firstDigit === undefined || !isAsciiDigit(firstDigit)) return false;
  if (firstDigit === '0') {
    state.index += 1;
  } else {
    while (state.index < state.text.length) {
      const digit = state.text[state.index];
      if (digit === undefined || !isAsciiDigit(digit)) break;
      state.index += 1;
    }
  }
  if (state.text[state.index] === '.') {
    state.index += 1;
    const fractionDigit = state.text[state.index];
    if (fractionDigit === undefined || !isAsciiDigit(fractionDigit)) return false;
    while (state.index < state.text.length) {
      const digit = state.text[state.index];
      if (digit === undefined || !isAsciiDigit(digit)) break;
      state.index += 1;
    }
  }
  const exponent = state.text[state.index];
  if (exponent === 'e' || exponent === 'E') {
    state.index += 1;
    const sign = state.text[state.index];
    if (sign === '+' || sign === '-') state.index += 1;
    const exponentDigit = state.text[state.index];
    if (exponentDigit === undefined || !isAsciiDigit(exponentDigit)) return false;
    while (state.index < state.text.length) {
      const digit = state.text[state.index];
      if (digit === undefined || !isAsciiDigit(digit)) break;
      state.index += 1;
    }
  }
  return state.index > start;
}

function parseArray(state: JsonState): boolean {
  if (state.text[state.index] !== '[') return false;
  state.index += 1;
  skipWhitespace(state);
  if (state.text[state.index] === ']') {
    state.index += 1;
    return true;
  }
  while (state.index < state.text.length) {
    if (!parseValue(state)) return false;
    skipWhitespace(state);
    const separator = state.text[state.index];
    if (separator === ',') {
      state.index += 1;
      skipWhitespace(state);
      continue;
    }
    if (separator === ']') {
      state.index += 1;
      return true;
    }
    return false;
  }
  return false;
}

function parseObject(state: JsonState): boolean {
  if (state.text[state.index] !== '{') return false;
  state.index += 1;
  skipWhitespace(state);
  if (state.text[state.index] === '}') {
    state.index += 1;
    return true;
  }
  while (state.index < state.text.length) {
    if (!parseString(state)) return false;
    skipWhitespace(state);
    if (state.text[state.index] !== ':') return false;
    state.index += 1;
    if (!parseValue(state)) return false;
    skipWhitespace(state);
    const separator = state.text[state.index];
    if (separator === ',') {
      state.index += 1;
      skipWhitespace(state);
      continue;
    }
    if (separator === '}') {
      state.index += 1;
      return true;
    }
    return false;
  }
  return false;
}

function parseValue(state: JsonState): boolean {
  skipWhitespace(state);
  const character = state.text[state.index];
  switch (character) {
    case '"':
      return parseString(state);
    case '{':
      return parseObject(state);
    case '[':
      return parseArray(state);
    case 't':
      return consumeLiteral(state, 'true');
    case 'f':
      return consumeLiteral(state, 'false');
    case 'n':
      return consumeLiteral(state, 'null');
    default:
      return character === '-' || (character !== undefined && isAsciiDigit(character))
        ? parseNumber(state)
        : false;
  }
}

/** @internal Check if a string is valid JSON */
export function isValidJson(value: string): boolean {
  const state: JsonState = { index: 0, text: value };
  if (!parseValue(state)) return false;
  skipWhitespace(state);
  return state.index === state.text.length;
}
