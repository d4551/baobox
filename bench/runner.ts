export interface BenchmarkSample {
  caseName: string;
  variant: string;
  iterations: number;
  elapsedNs: number;
  nsPerOp: number;
  opsPerSecond: number;
  note?: string;
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

  const started = Bun.nanoseconds();
  for (let index = 0; index < iterations; index += 1) {
    callback();
  }
  const elapsedNs = Bun.nanoseconds() - started;
  const nsPerOp = elapsedNs / iterations;
  const opsPerSecond = Math.round((iterations * 1_000_000_000) / elapsedNs);

  return {
    caseName,
    variant,
    iterations,
    elapsedNs,
    nsPerOp,
    opsPerSecond,
    note,
  };
}
