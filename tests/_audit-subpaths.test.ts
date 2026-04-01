import { describe, expect, it } from 'bun:test';

describe('AUDIT: subpath exports resolve', () => {
  it('baobox/typebox resolves with Value and Compile', async () => {
    const mod = await import('../src/typebox.ts');
    expect(mod.Value).toBeDefined();
    expect(typeof mod.Value.Check).toBe('function');
    expect(typeof mod.Compile).toBe('function');
    expect(typeof mod.String).toBe('function');
    expect(typeof mod.Object).toBe('function');
    expect(typeof mod.Script).toBe('function');
  });

  it('baobox/elysia resolves with t namespace', async () => {
    const mod = await import('../src/elysia/index.ts');
    expect(mod.t).toBeDefined();
    expect(typeof mod.t.String).toBe('function');
    expect(typeof mod.t.Object).toBe('function');
    expect(typeof mod.decorateSchema).toBe('function');
    expect(typeof mod.Value).toBe('object');
    expect(typeof mod.Compile).toBe('function');
  });

  it('baobox/value resolves with ErrorsIterator', async () => {
    const mod = await import('../src/value/index.ts');
    expect(typeof mod.ErrorsIterator).toBe('function');
    expect(typeof mod.Value.ErrorsIterator).toBe('function');
    expect(mod.ValueErrorType).toBeDefined();
  });

  it('main entry exports all new additions', async () => {
    const mod = await import('../src/index.ts');
    expect(typeof mod.ErrorsIterator).toBe('function');
    expect(mod.ValueErrorType).toBeDefined();
    expect(typeof mod.CompileCached).toBe('function');
    expect(typeof mod.CompileFromArtifact).toBe('function');
  });

  it('package.json has all expected export entries', async () => {
    const pkg = await Bun.file(new URL('../package.json', import.meta.url)).json();
    const exports = pkg.exports;

    expect(exports['.']).toBeDefined();
    expect(exports['./typebox']).toBeDefined();
    expect(exports['./elysia']).toBeDefined();
    expect(exports['./value']).toBeDefined();
    expect(exports['./type']).toBeDefined();
    expect(exports['./compile']).toBeDefined();
    expect(exports['./error']).toBeDefined();
    expect(exports['./standard']).toBeDefined();

    // Verify bun conditions point to src/
    for (const [, entry] of Object.entries(exports)) {
      const bunPath = (entry as Record<string, string | undefined>).bun;
      if (bunPath === undefined) {
        throw new Error('Missing bun export condition');
      }
      expect(bunPath.startsWith('./src/')).toBe(true);
    }
  });

  it('package.json has bin entry for CLI', async () => {
    const pkg = await Bun.file(new URL('../package.json', import.meta.url)).json();
    expect(pkg.bin).toBeDefined();
    expect(pkg.bin.baobox).toBe('./dist/cli/index.js');
  });

  it('build script includes all new entrypoints', async () => {
    const pkg = await Bun.file(new URL('../package.json', import.meta.url)).json();
    const buildScript = pkg.scripts.build;
    expect(buildScript).toContain('src/elysia/index.ts');
    expect(buildScript).toContain('src/cli/index.ts');
    expect(buildScript).toContain('src/typebox.ts');
  });
});
