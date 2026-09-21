// Stub for the "cloudflare:workers" virtual module, which only exists in the
// real Workers runtime — vitest here runs in plain "node" (no
// @cloudflare/vitest-pool-workers), so it can't resolve it natively.
// Aliased in vitest.config.ts. Spans are no-ops: enterSpan/startActiveSpan
// just run the callback, matching the real API shape (see
// src/index.ts's tracing.enterSpan usage).
class Span {
  readonly isTraced = false;
  setAttribute(_key: string, _value: unknown): void {}
  end(): void {}
}

export const tracing = {
  enterSpan<T>(_name: string, callback: (span: Span) => T): T {
    return callback(new Span());
  },
  startActiveSpan<T>(_name: string, callback: (span: Span) => T): T {
    return callback(new Span());
  },
};
