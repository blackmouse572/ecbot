/**
 * An ingest failure that retrying cannot fix (e.g. a FILE item with no
 * attachment): the item is marked failed once instead of being retried.
 */
export class PermanentIngestError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'PermanentIngestError';
    }
}
