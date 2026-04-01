/** Core migration engine — scans files and applies transforms */

import { transformImport } from './transforms/imports.js';
import { transformApiCalls, detectManualReviewItems } from './transforms/api-calls.js';

export interface MigrationOptions {
  dryRun: boolean;
  path: string;
  report: boolean;
}

export interface FileChange {
  filePath: string;
  originalLines: string[];
  transformedLines: string[];
  changedLineNumbers: number[];
  notes: string[];
  manualReviewItems: string[];
}

export interface MigrationReport {
  filesScanned: number;
  filesChanged: number;
  changes: FileChange[];
  totalTransforms: number;
  totalManualReviewItems: number;
}

const SKIP_DIRS = new Set([
  'node_modules', '.git', 'dist', 'build', 'out',
  '.turbo', '.cache', '.next', '.nuxt', '.output',
]);

function isTypeScriptFile(path: string): boolean {
  return path.endsWith('.ts') || path.endsWith('.tsx');
}

function hasTypeBoxImport(content: string): boolean {
  return content.includes('@sinclair/typebox');
}

async function scanDirectory(dir: string): Promise<string[]> {
  const { readdir } = await import('node:fs/promises');
  const { join } = await import('node:path');
  const results: string[] = [];

  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (SKIP_DIRS.has(entry.name)) {
      continue;
    }
    if (entry.isDirectory()) {
      results.push(...await scanDirectory(fullPath));
    } else if (isTypeScriptFile(entry.name)) {
      results.push(fullPath);
    }
  }
  return results;
}

function migrateFileContent(content: string, filePath: string): FileChange {
  const lines = content.split('\n');
  const transformedLines: string[] = [];
  const changedLineNumbers: number[] = [];
  const notes: string[] = [];
  const manualReviewItems: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const originalLine = lines[i]!;
    let line = originalLine;
    let changed = false;

    // Detect manual review items on the ORIGINAL line before transforms
    manualReviewItems.push(...detectManualReviewItems(originalLine, i + 1));

    // Apply import transforms
    const importResult = transformImport(line);
    if (importResult.changed) {
      line = importResult.line;
      changed = true;
      if (importResult.note) notes.push(`Line ${i + 1}: ${importResult.note}`);
    }

    // Apply API call transforms
    const apiResult = transformApiCalls(line);
    if (apiResult.changed) {
      line = apiResult.line;
      changed = true;
      if (apiResult.note) notes.push(`Line ${i + 1}: ${apiResult.note}`);
    }

    transformedLines.push(line);
    if (changed) changedLineNumbers.push(i + 1);
  }

  return {
    filePath,
    originalLines: lines,
    transformedLines,
    changedLineNumbers,
    notes,
    manualReviewItems,
  };
}

export async function migrate(options: MigrationOptions): Promise<MigrationReport> {
  const { readFile, writeFile } = await import('node:fs/promises');

  const files = await scanDirectory(options.path);
  const changes: FileChange[] = [];
  let totalTransforms = 0;
  let totalManualReviewItems = 0;

  for (const filePath of files) {
    const content = await readFile(filePath, 'utf8');
    if (!hasTypeBoxImport(content)) continue;

    const change = migrateFileContent(content, filePath);
    if (change.changedLineNumbers.length > 0 || change.manualReviewItems.length > 0) {
      changes.push(change);
      totalTransforms += change.changedLineNumbers.length;
      totalManualReviewItems += change.manualReviewItems.length;

      if (!options.dryRun && change.changedLineNumbers.length > 0) {
        await writeFile(filePath, change.transformedLines.join('\n'));
      }
    }
  }

  return {
    filesScanned: files.length,
    filesChanged: changes.filter((c) => c.changedLineNumbers.length > 0).length,
    changes,
    totalTransforms,
    totalManualReviewItems,
  };
}
