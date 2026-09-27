import { createHash, createHmac, timingSafeEqual } from 'crypto';

// Shared by every channel delivered through a Meta app webhook (Messenger,
// WhatsApp): the same `hub.*` handshake and `x-hub-signature-256` HMAC.

export function verifyMetaChallenge(
    req: Request,
    verifyToken: string
): Response | null {
    if (req.method !== 'GET') return null;
    const url = new URL(req.url);
    const mode = url.searchParams.get('hub.mode');
    const token = url.searchParams.get('hub.verify_token');
    const challenge = url.searchParams.get('hub.challenge');
    if (
        mode === 'subscribe' &&
        token !== null &&
        verifyToken &&
        constantTimeEquals(token, verifyToken)
    ) {
        return new Response(challenge ?? '', { status: 200 });
    }
    return new Response('Forbidden', { status: 403 });
}

// Hash both to fixed length before timingSafeEqual — avoids a RangeError
// on mismatched lengths and eliminates the length/content timing leak a
// plain `===` compare has (mirrors TelegramPlatformAdapter.verifySignature).
function constantTimeEquals(a: string, b: string): boolean {
    const ah = createHash('sha256').update(a).digest();
    const bh = createHash('sha256').update(b).digest();
    return timingSafeEqual(ah, bh);
}

export function verifyMetaSignature(
    rawBody: string,
    headers: Headers | Record<string, string>,
    appSecret: string
): boolean {
    if (!appSecret) return false;
    const sig =
        headers instanceof Headers
            ? headers.get('x-hub-signature-256')
            : (headers['x-hub-signature-256'] ??
              headers['X-Hub-Signature-256']);
    if (!sig) return false;
    const [algo, hash] = sig.split('=');
    if (algo !== 'sha256' || !hash) return false;
    try {
        const computed = createHmac('sha256', appSecret)
            .update(rawBody, 'utf8')
            .digest('hex');
        return timingSafeEqual(
            Buffer.from(hash, 'hex'),
            Buffer.from(computed, 'hex')
        );
    } catch {
        return false;
    }
}
