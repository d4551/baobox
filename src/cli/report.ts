/** Format migration report as human-readable output */

import type { MigrationReport, FileChange } from './migrate.js';

function formatDiff(change: FileChange): string {
  const lines: string[] = [];
  lines.push(`  ${change.filePath}`);

  for (const lineNum of change.changedLineNumbers) {
    const original = change.originalLines[lineNum - 1];
    const transformed = change.transformedLines[lineNum - 1];
    lines.push(`    L${lineNum}:`);
    lines.push(`    - ${original}`);
    lines.push(`    + ${transformed}`);
  }

  if (change.manualReviewItems.length > 0) {
    lines.push('    Manual review needed:');
    for (const item of change.manualReviewItems) {
      lines.push(`      ! ${item}`);
    }
  }

  return lines.join('\n');
}

export function formatMigrationReport(report: MigrationReport, dryRun: boolean): string {
  const lines: string[] = [];

  lines.push('');
  lines.push(`baobox migrate${dryRun ? ' (dry run)' : ''}`);
  lines.push('='.repeat(40));
  lines.push('');
  lines.push(`Files scanned: ${report.filesScanned}`);
  lines.push(`Files ${dryRun ? 'would change' : 'changed'}: ${report.filesChanged}`);
  lines.push(`Total transforms: ${report.totalTransforms}`);
  lines.push(`Manual review items: ${report.totalManualReviewItems}`);
  lines.push('');

  if (report.changes.length > 0) {
    lines.push('Changes:');
    lines.push('');
    for (const change of report.changes) {
      lines.push(formatDiff(change));
      lines.push('');
    }
  }

  if (report.totalManualReviewItems > 0) {
    lines.push('Note: Items flagged for manual review need human attention.');
    lines.push('These patterns have no direct baobox equivalent or behave differently.');
    lines.push('');
  }

  return lines.join('\n');
}
