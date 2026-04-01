/** API call rewriting rules for TypeBox → baobox migration */

export interface TransformResult {
  line: string;
  changed: boolean;
  note?: string | undefined;
}

interface ApiTransform {
  pattern: RegExp;
  replacement: string;
  note?: string;
}

const API_TRANSFORMS: ApiTransform[] = [
  {
    pattern: /TypeCompiler\.Compile\(/g,
    replacement: 'Compile(',
    note: 'TypeCompiler.Compile → Compile (add import from baobox/compile)',
  },
  {
    pattern: /TypeCompiler\.Code\(/g,
    replacement: 'Code(',
    note: 'TypeCompiler.Code → Code (add import from baobox/compile)',
  },
];

const MANUAL_REVIEW_PATTERNS = [
  { pattern: /\[Kind\]/, message: 'Uses [Kind] symbol — baobox uses \'~kind\' string property instead' },
  { pattern: /\[Hint\]/, message: 'Uses [Hint] symbol — baobox does not use Hint symbols' },
  { pattern: /Value\.Errors\(/, message: 'Value.Errors() returns SchemaError[] in baobox (not an iterator). Use ErrorsIterator() for TypeBox-compatible iterator format' },
  { pattern: /FormatRegistry\.Set/, message: 'Format registry is scoped to RuntimeContext in baobox — use CreateRuntimeContext() instead of global registry' },
  { pattern: /TypeRegistry\.Set/, message: 'Type registry is scoped to RuntimeContext in baobox' },
];

/** Heuristic: skip transforms on comment lines and lines where the match is likely inside a string */
function isCodeLine(line: string): boolean {
  const trimmed = line.trimStart();
  // Skip single-line comments
  if (trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('/*')) {
    return false;
  }
  return true;
}

export function transformApiCalls(line: string): TransformResult {
  // Don't transform comment lines to avoid corrupting documentation
  if (!isCodeLine(line)) {
    return { line, changed: false };
  }

  let result = line;
  let changed = false;
  const notes: string[] = [];

  for (const rule of API_TRANSFORMS) {
    const replaced = result.replace(rule.pattern, rule.replacement);
    if (replaced !== result) {
      result = replaced;
      changed = true;
      if (rule.note) notes.push(rule.note);
    }
  }

  return { line: result, changed, note: notes.length > 0 ? notes.join('; ') : undefined };
}

export function detectManualReviewItems(line: string, lineNumber: number): string[] {
  const items: string[] = [];
  for (const rule of MANUAL_REVIEW_PATTERNS) {
    if (rule.pattern.test(line)) {
      items.push(`Line ${lineNumber}: ${rule.message}`);
    }
  }
  return items;
}
