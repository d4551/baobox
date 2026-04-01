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
  {
    pattern: /Value\.Check\(/g,
    replacement: 'Check(',
    note: 'Value.Check → Check (add import from baobox or baobox/value)',
  },
  {
    pattern: /Value\.Clean\(/g,
    replacement: 'Clean(',
    note: 'Value.Clean → Clean (add import from baobox or baobox/value)',
  },
  {
    pattern: /Value\.Convert\(/g,
    replacement: 'Convert(',
    note: 'Value.Convert → Convert (add import from baobox or baobox/value)',
  },
  {
    pattern: /Value\.Create\(/g,
    replacement: 'Create(',
    note: 'Value.Create → Create (add import from baobox or baobox/value)',
  },
  {
    pattern: /Value\.Default\(/g,
    replacement: 'Default(',
    note: 'Value.Default → Default (add import from baobox or baobox/value)',
  },
  {
    pattern: /Value\.Decode\(/g,
    replacement: 'Decode(',
    note: 'Value.Decode → Decode (add import from baobox/value)',
  },
  {
    pattern: /Value\.Encode\(/g,
    replacement: 'Encode(',
    note: 'Value.Encode → Encode (add import from baobox/value)',
  },
  {
    pattern: /Value\.Parse\(/g,
    replacement: 'Parse(',
    note: 'Value.Parse → Parse (add import from baobox or baobox/value)',
  },
  {
    pattern: /Value\.Assert\(/g,
    replacement: 'Assert(',
    note: 'Value.Assert → Assert (add import from baobox or baobox/value)',
  },
];

const MANUAL_REVIEW_PATTERNS = [
  { pattern: /\[Kind\]/, message: 'Uses [Kind] symbol — baobox uses \'~kind\' string property instead. Use baobox/elysia for Elysia compatibility' },
  { pattern: /\[Hint\]/, message: 'Uses [Hint] symbol — baobox does not use Hint symbols' },
  { pattern: /Value\.Errors\(/, message: 'Value.Errors() returns SchemaError[] in baobox (not an iterator). Use ErrorsIterator() for TypeBox-compatible iterator format' },
  { pattern: /FormatRegistry\.Set/, message: 'Format registry is scoped to RuntimeContext in baobox — use CreateRuntimeContext() instead of global registry' },
  { pattern: /TypeRegistry\.Set/, message: 'Type registry is scoped to RuntimeContext in baobox' },
  { pattern: /TypeSystemPolicy/, message: 'TypeSystemPolicy is configured via RuntimeContext in baobox — use CreateRuntimeContext() with TypeSystemPolicy options' },
  { pattern: /Value\.Mutate\(/, message: 'Value.Mutate() exists in baobox but may have different semantics — verify behavior' },
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
