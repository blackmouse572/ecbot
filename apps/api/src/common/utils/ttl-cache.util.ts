/**
 * In-process cache with a fixed time-to-live and a size cap. Each API instance
 * keeps its own copy, so a cached value can be up to `ttlMs` stale on any
 * instance: only use it where that delay is acceptable and no invalidation is
 * needed.
 */
export class TtlCache<T> {
    private readonly entries = new Map<string, { value: T; expires: number }>();

    constructor(
        private readonly ttlMs: number,
        private readonly maxEntries: number,
        private readonly now: () => number = Date.now
    ) {}

    get(key: string): T | undefined {
        const entry = this.entries.get(key);
        if (!entry) return undefined;
        if (entry.expires <= this.now()) {
            this.entries.delete(key);
            return undefined;
        }
        return entry.value;
    }

    set(key: string, value: T): void {
        // Map keeps insertion order, so the first key is the oldest.
        this.entries.delete(key);
        if (this.entries.size >= this.maxEntries) {
            this.entries.delete(this.entries.keys().next().value!);
        }
        this.entries.set(key, { value, expires: this.now() + this.ttlMs });
    }
}
