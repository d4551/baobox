#!/usr/bin/env bun
/** baobox CLI — migration tool for TypeBox to baobox */

import { migrate } from './migrate.js';
import { formatMigrationReport } from './report.js';
import { resolve } from 'node:path';

function printUsage(): void {
  const usage = `
Usage: baobox migrate [options]

Migrate TypeBox imports and API calls to baobox equivalents.

Options:
  --dry-run      Show what would change without writing files (default)
  --write        Apply changes to files
  --path <dir>   Target directory to scan (default: current directory)
  --include-js   Also scan .js, .jsx, .mjs, .cjs files
  --help         Show this help message

Examples:
  baobox migrate                         # dry run in current directory
  baobox migrate --path ./src            # dry run in ./src
  baobox migrate --write                 # apply changes
  baobox migrate --include-js            # include JS files
  baobox migrate --dry-run --path .      # explicit dry run
`;
  process.stdout.write(usage);
}

function parseArgs(args: string[]): { command: string; dryRun: boolean; path: string; help: boolean; includeJs: boolean } {
  let command = '';
  let dryRun = true;
  let path = process.cwd();
  let help = false;
  let includeJs = false;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i]!;
    if (arg === 'migrate') {
      command = 'migrate';
    } else if (arg === '--dry-run') {
      dryRun = true;
    } else if (arg === '--write') {
      dryRun = false;
    } else if (arg === '--path' && i + 1 < args.length) {
      path = resolve(args[++i]!);
    } else if (arg === '--include-js') {
      includeJs = true;
    } else if (arg === '--help' || arg === '-h') {
      help = true;
    }
  }

  return { command, dryRun, path, help, includeJs };
}

async function main(): Promise<void> {
  const cliArgs = process.argv.slice(2);
  const { command, dryRun, path, help, includeJs } = parseArgs(cliArgs);

  if (help || !command) {
    printUsage();
    process.exit(help ? 0 : 1);
  }

  if (command === 'migrate') {
    const report = await migrate({ dryRun, path, report: true, includeJs });
    process.stdout.write(formatMigrationReport(report, dryRun));

    if (report.filesChanged === 0 && report.totalManualReviewItems === 0) {
      process.stdout.write('No TypeBox imports found.\n');
    }
  }
}

main().catch((error: unknown) => {
  process.stderr.write(`Error: ${error instanceof Error ? error.message : String(error)}\n`);
  process.exit(1);
});
