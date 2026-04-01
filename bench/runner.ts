export interface BenchmarkSample {
  caseName: string;
  variant: string;
  iterations: number;
  elapsedNs: number;
  nsPerOp: number;
  opsPerSecond: number;
  median: number;
  p95: number;
  p99: number;
  note?: string;
}

function percentile(sorted: number[], p: number): number {
  const index = (p / 100) * (sorted.length - 1);
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  if (lower === upper) return sorted[lower]!;
  const fraction = index - lower;
  return sorted[lower]! * (1 - fraction) + sorted[upper]! * fraction;
}

export function runBenchmark(
  caseName: string,
  variant: string,
  iterations: number,
  callback: () => void,
  note?: string,
): BenchmarkSample {
  const warmupIterations = Math.max(1_000, Math.floor(iterations / 20));
  for (let index = 0; index < warmupIterations; index += 1) {
    callback();
  }

  const times: number[] = new Array(iterations) as number[];
  const started = Bun.nanoseconds();
  for (let index = 0; index < iterations; index += 1) {
    const iterStart = Bun.nanoseconds();
    callback();
    times[index] = Bun.nanoseconds() - iterStart;
  }
  const elapsedNs = Bun.nanoseconds() - started;
  const nsPerOp = elapsedNs / iterations;
  const opsPerSecond = Math.round((iterations * 1_000_000_000) / elapsedNs);

  times.sort((a, b) => a - b);
  const median = percentile(times, 50);
  const p95 = percentile(times, 95);
  const p99 = percentile(times, 99);

  return {
    caseName,
    variant,
    iterations,
    elapsedNs,
    nsPerOp,
    opsPerSecond,
    median,
    p95,
    p99,
    ...(note === undefined ? {} : { note }),
  };
}
