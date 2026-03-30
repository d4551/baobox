import type { SchemaIssueParams } from '../catalog-types.js';

export function formatList(values: readonly string[] | undefined): string {
  return values === undefined ? '' : values.join(', ');
}

export function labelFor(params: SchemaIssueParams, fallback: string): string {
  return params.label ?? fallback;
}
