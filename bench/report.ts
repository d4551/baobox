import type { BenchmarkSample } from './runner.ts';

function formatInteger(value: number): string {
  return value.toLocaleString('en-US');
}

function formatRatio(numerator: number, denominator: number): string {
  return `${(numerator / denominator).toFixed(2)}x`;
}

function renderTable(title: string, rows: string[]): string[] {
  return [
    '',
    title,
    '',
    '| Case | Variant | Ops/s | ns/op | Median ns | p95 ns | Relative | Notes |',
    '| --- | --- | ---: | ---: | ---: | ---: | ---: | --- |',
    ...rows,
  ];
}

export function formatBenchmarkReport(samples: BenchmarkSample[]): string {
  const lines = ['# Baobox benchmark suite', '', `Generated with Bun ${Bun.version}`];
  const validationRows: string[] = [];
  const codecRows: string[] = [];
  const schemaCreationRows: string[] = [];

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
    const localCreate = caseSamples.find((sample) => sample.variant === 'baobox.object');
    const upstreamCreate = caseSamples.find((sample) => sample.variant === 'typebox.object');

    if (localCheck && upstreamCheck && localCompile && upstreamCompile) {
      validationRows.push(
        `| ${caseName} | baobox.check | ${formatInteger(localCheck.opsPerSecond)} | ${localCheck.nsPerOp.toFixed(1)} | ${localCheck.median.toFixed(1)} | ${localCheck.p95.toFixed(1)} | ${formatRatio(localCheck.opsPerSecond, upstreamCheck.opsPerSecond)} vs typebox.value.check | ${localCheck.note ?? ''} |`,
        `| ${caseName} | typebox.value.check | ${formatInteger(upstreamCheck.opsPerSecond)} | ${upstreamCheck.nsPerOp.toFixed(1)} | ${upstreamCheck.median.toFixed(1)} | ${upstreamCheck.p95.toFixed(1)} | baseline | ${upstreamCheck.note ?? ''} |`,
        `| ${caseName} | baobox.compile | ${formatInteger(localCompile.opsPerSecond)} | ${localCompile.nsPerOp.toFixed(1)} | ${localCompile.median.toFixed(1)} | ${localCompile.p95.toFixed(1)} | ${formatRatio(localCompile.opsPerSecond, upstreamCompile.opsPerSecond)} vs typebox.compile | ${localCompile.note ?? ''} |`,
        `| ${caseName} | typebox.compile | ${formatInteger(upstreamCompile.opsPerSecond)} | ${upstreamCompile.nsPerOp.toFixed(1)} | ${upstreamCompile.median.toFixed(1)} | ${upstreamCompile.p95.toFixed(1)} | baseline | ${upstreamCompile.note ?? ''} |`,
      );
    }

    if (localDecode && upstreamDecode && localEncode && upstreamEncode) {
      codecRows.push(
        `| ${caseName} | baobox.decode | ${formatInteger(localDecode.opsPerSecond)} | ${localDecode.nsPerOp.toFixed(1)} | ${localDecode.median.toFixed(1)} | ${localDecode.p95.toFixed(1)} | ${formatRatio(localDecode.opsPerSecond, upstreamDecode.opsPerSecond)} vs typebox.decode | ${localDecode.note ?? ''} |`,
        `| ${caseName} | typebox.decode | ${formatInteger(upstreamDecode.opsPerSecond)} | ${upstreamDecode.nsPerOp.toFixed(1)} | ${upstreamDecode.median.toFixed(1)} | ${upstreamDecode.p95.toFixed(1)} | baseline | ${upstreamDecode.note ?? ''} |`,
        `| ${caseName} | baobox.encode | ${formatInteger(localEncode.opsPerSecond)} | ${localEncode.nsPerOp.toFixed(1)} | ${localEncode.median.toFixed(1)} | ${localEncode.p95.toFixed(1)} | ${formatRatio(localEncode.opsPerSecond, upstreamEncode.opsPerSecond)} vs typebox.encode | ${localEncode.note ?? ''} |`,
        `| ${caseName} | typebox.encode | ${formatInteger(upstreamEncode.opsPerSecond)} | ${upstreamEncode.nsPerOp.toFixed(1)} | ${upstreamEncode.median.toFixed(1)} | ${upstreamEncode.p95.toFixed(1)} | baseline | ${upstreamEncode.note ?? ''} |`,
      );
    }

    if (localCreate && upstreamCreate) {
      schemaCreationRows.push(
        `| ${caseName} | baobox.object | ${formatInteger(localCreate.opsPerSecond)} | ${localCreate.nsPerOp.toFixed(1)} | ${localCreate.median.toFixed(1)} | ${localCreate.p95.toFixed(1)} | ${formatRatio(localCreate.opsPerSecond, upstreamCreate.opsPerSecond)} vs typebox.object | ${localCreate.note ?? ''} |`,
        `| ${caseName} | typebox.object | ${formatInteger(upstreamCreate.opsPerSecond)} | ${upstreamCreate.nsPerOp.toFixed(1)} | ${upstreamCreate.median.toFixed(1)} | ${upstreamCreate.p95.toFixed(1)} | baseline | ${upstreamCreate.note ?? ''} |`,
      );
    }
  }

  lines.push(...renderTable('## Validation comparisons', validationRows));
  lines.push(...renderTable('## Codec comparisons', codecRows));
  lines.push(...renderTable('## Schema creation comparisons', schemaCreationRows));
  lines.push(
    '',
    'Legend:',
    '',
    '- `baobox.compile` strategy notes identify whether the validator used the generic JIT path or the Bun-native binary path.',
    '- Relative figures above `1.00x` mean baobox was faster for that row.',
    '- `Median ns` and `p95 ns` are per-operation nanosecond timings at the 50th and 95th percentile.',
  );
  return `${lines.join('\n')}\n`;
}
