/** Id of a relation that may be loaded, a reference, or a bare id. */
export function refId(value: unknown): string | undefined {
    if (typeof value === 'string') return value;
    return (value as { id?: string } | null | undefined)?.id;
}
