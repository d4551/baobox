/** Import path rewriting rules for TypeBox → baobox migration */

interface ImportTransform {
  from: RegExp;
  to: string;
}

const IMPORT_TRANSFORMS: ImportTransform[] = [
  { from: /['"]@sinclair\/typebox\/value['"]/, to: "'baobox/value'" },
  { from: /['"]@sinclair\/typebox\/compiler['"]/, to: "'baobox/compile'" },
  { from: /['"]@sinclair\/typebox\/type['"]/, to: "'baobox/type'" },
  { from: /['"]@sinclair\/typebox\/errors['"]/, to: "'baobox/error'" },
  { from: /['"]@sinclair\/typebox['"]/, to: "'baobox'" },
];

export interface TransformResult {
  line: string;
  changed: boolean;
  note?: string;
}

export function transformImport(line: string): TransformResult {
  for (const rule of IMPORT_TRANSFORMS) {
    if (rule.from.test(line)) {
      return {
        line: line.replace(rule.from, rule.to),
        changed: true,
      };
    }
  }
  return { line, changed: false };
}
