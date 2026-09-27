/**
 * Read a fetch `Response` body, giving up once it passes `maxBytes` — checked
 * against the declared length first, then while streaming, so an oversized
 * or endless body is never buffered whole. Null when over the cap.
 */
export async function readCappedBody(
    res: Response,
    maxBytes: number
): Promise<Buffer | null> {
    if (Number(res.headers.get('content-length')) > maxBytes) {
        await res.body?.cancel();
        return null;
    }
    if (!res.body) return Buffer.alloc(0);

    const reader = res.body.getReader();
    const chunks: Uint8Array[] = [];
    let total = 0;
    for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        total += value.length;
        if (total > maxBytes) {
            await reader.cancel();
            return null;
        }
        chunks.push(value);
    }
    return Buffer.concat(chunks);
}
