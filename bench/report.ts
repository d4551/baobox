import type { BenchmarkSample } from './runner.ts';

function formatInteger(value: number): string {
  return value.toLocaleString('en-US');
}

function formatRatio(numerator: number, denominator: number): string {
  return `${(numerator / denominator).toFixed(2)}x`;
}

function renderTable(title: string, rows: string[]): string[] {
  return ['', title, '', '| Case | Variant | Ops/s | ns/op | Relative | Notes |', '| --- | --- | ---: | ---: | ---: | --- |', ...rows];
}

export function formatBenchmarkReport(samples: BenchmarkSample[]): string {
  const lines = ['# Baobox benchmark suite', '', `Generated with Bun ${Bun.version}`];
  const validationRows: string[] = [];
  const codecRows: string[] = [];

  const caseNames = Array.from(new Set(samples.map((sample) => sample.caseName)));
  for (const caseName of caseNames) {
    const caseSamples = samples.filter((sample) => sample.caseName === caseName);
    const localCheck = caseSamples.find((sample) => sample.variant === 'baobox.check');
    const upstreamCheck = caseSamples.find((sample) => sample.variant === 'typebox.value.check');
    const localCompile = caseSamples.find((sample) => sample.variant === 'baobox.compile');
    const upstreamCompile = caseSamples.find((sample) => sample.variant === 'typebox.compile');
    const localDecode = caseSamples.find((sample) => sample.variant === 'baobox.decode');
    const upstreamDecode = caseSamples.find((sample) => sample.variant === 'typebox.decode');
    const localEncode = caseSamples.find((sample) => sample.variant === 'baobox.encode');
    const upstreamEncode = caseSamples.find((sample) => sample.variant === 'typebox.encode');

    if (localCheck && upstreamCheck && localCompile && upstreamCompile) {
      validationRows.push(
        `| ${caseName} | baobox.check | ${formatInteger(localCheck.opsPerSecond)} | ${localCheck.nsPerOp.toFixed(1)} | ${formatRatio(localCheck.opsPerSecond, upstreamCheck.opsPerSecond)} vs typebox.value.check | ${localCheck.note ?? ''} |`,
        `| ${caseName} | typebox.value.check | ${formatInteger(upstreamCheck.opsPerSecond)} | ${upstreamCheck.nsPerOp.toFixed(1)} | baseline | ${upstreamCheck.note ?? ''} |`,
        `| ${caseName} | baobox.compile | ${formatInteger(localCompile.opsPerSecond)} | ${localCompile.nsPerOp.toFixed(1)} | ${formatRatio(localCompile.opsPerSecond, upstreamCompile.opsPerSecond)} vs typebox.compile | ${localCompile.note ?? ''} |`,
        `| ${caseName} | typebox.compile | ${formatInteger(upstreamCompile.opsPerSecond)} | ${upstreamCompile.nsPerOp.toFixed(1)} | baseline | ${upstreamCompile.note ?? ''} |`,
      );
    }

    if (localDecode && upstreamDecode && localEncode && upstreamEncode) {
      codecRows.push(
        `| ${caseName} | baobox.decode | ${formatInteger(localDecode.opsPerSecond)} | ${localDecode.nsPerOp.toFixed(1)} | ${formatRatio(localDecode.opsPerSecond, upstreamDecode.opsPerSecond)} vs typebox.decode | ${localDecode.note ?? ''} |`,
        `| ${caseName} | typebox.decode | ${formatInteger(upstreamDecode.opsPerSecond)} | ${upstreamDecode.nsPerOp.toFixed(1)} | baseline | ${upstreamDecode.note ?? ''} |`,
        `| ${caseName} | baobox.encode | ${formatInteger(localEncode.opsPerSecond)} | ${localEncode.nsPerOp.toFixed(1)} | ${formatRatio(localEncode.opsPerSecond, upstreamEncode.opsPerSecond)} vs typebox.encode | ${localEncode.note ?? ''} |`,
        `| ${caseName} | typebox.encode | ${formatInteger(upstreamEncode.opsPerSecond)} | ${upstreamEncode.nsPerOp.toFixed(1)} | baseline | ${upstreamEncode.note ?? ''} |`,
      );
    }
  }

  lines.push(...renderTable('## Validation comparisons', validationRows));
  lines.push(...renderTable('## Codec comparisons', codecRows));
  lines.push('', 'Legend:', '', '- `baobox.compile` strategy notes identify whether the validator used the generic JIT path or the Bun-native binary path.', '- Relative figures above `1.00x` mean baobox was faster for that row.');
  return `${lines.join('\n')}\n`;
}
