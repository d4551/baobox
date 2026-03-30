import Baobox from '../src/index.ts';
import { Check as BaoboxCheck } from '../src/value/check.ts';
import { Compile as BaoboxCompile } from '../src/compile/index.ts';
import { Decode as BaoboxDecode } from '../src/value/decode.ts';
import { Encode as BaoboxEncode } from '../src/value/encode.ts';
import { codecCases, validationCases } from './cases.ts';
import { formatBenchmarkReport } from './report.ts';
import { runBenchmark, type BenchmarkSample } from './runner.ts';
import TypeBoxValue from 'typebox/value';
import { Compile as TypeBoxCompile } from 'typebox/compile';

const samples: BenchmarkSample[] = [];

for (const benchmarkCase of validationCases) {
  const localValidator = BaoboxCompile(benchmarkCase.localSchema);
  const upstreamValidator = TypeBoxCompile(benchmarkCase.upstreamSchema);
  samples.push(
    runBenchmark(benchmarkCase.name, 'baobox.check', benchmarkCase.iterations, () => {
      BaoboxCheck(benchmarkCase.localSchema, benchmarkCase.value);
    }),
    runBenchmark(benchmarkCase.name, 'typebox.value.check', benchmarkCase.iterations, () => {
      TypeBoxValue.Check(benchmarkCase.upstreamSchema, benchmarkCase.value);
    }),
    runBenchmark(benchmarkCase.name, 'baobox.compile', benchmarkCase.iterations, () => {
      localValidator.Check(benchmarkCase.value);
    }, localValidator.Strategy()),
    runBenchmark(benchmarkCase.name, 'typebox.compile', benchmarkCase.iterations, () => {
      upstreamValidator.Check(benchmarkCase.value);
    }),
  );
}

for (const benchmarkCase of codecCases) {
  samples.push(
    runBenchmark(benchmarkCase.name, 'baobox.decode', benchmarkCase.iterations, () => {
      BaoboxDecode(benchmarkCase.localSchema, benchmarkCase.encodedValue);
    }),
    runBenchmark(benchmarkCase.name, 'typebox.decode', benchmarkCase.iterations, () => {
      TypeBoxValue.Decode(benchmarkCase.upstreamSchema, benchmarkCase.encodedValue);
    }),
    runBenchmark(benchmarkCase.name, 'baobox.encode', benchmarkCase.iterations, () => {
      BaoboxEncode(benchmarkCase.localSchema, benchmarkCase.decodedValue);
    }),
    runBenchmark(benchmarkCase.name, 'typebox.encode', benchmarkCase.iterations, () => {
      TypeBoxValue.Encode(benchmarkCase.upstreamSchema, benchmarkCase.decodedValue);
    }),
  );
}

await Bun.write(Bun.stdout, formatBenchmarkReport(samples));
