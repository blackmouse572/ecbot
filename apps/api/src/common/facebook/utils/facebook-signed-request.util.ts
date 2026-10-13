import { createHmac, timingSafeEqual } from 'crypto';
import { IFacebookSignedRequestPayload } from '../interfaces/facebook-signed-request.interface';

/**
 * Verifies and decodes a Meta `signed_request` (`<signature>.<payload>`, both
 * base64url, signed with HMAC-SHA256 under the app secret). Returns null for
 * anything that is malformed, unsigned, or signed with another secret.
 */
export function parseFacebookSignedRequest(
    signedRequest: unknown,
    appSecret: string
): IFacebookSignedRequestPayload | null {
    if (!appSecret || typeof signedRequest !== 'string') return null;

    const parts = signedRequest.split('.');
    if (parts.length !== 2 || !parts[0] || !parts[1]) return null;
    const [encodedSignature, encodedPayload] = parts;

    const expected = createHmac('sha256', appSecret)
        .update(encodedPayload)
        .digest();
    const signature = Buffer.from(encodedSignature, 'base64url');
    if (
        signature.length !== expected.length ||
        !timingSafeEqual(signature, expected)
    ) {
        return null;
    }

    try {
        const payload = JSON.parse(
            Buffer.from(encodedPayload, 'base64url').toString('utf8')
        ) as IFacebookSignedRequestPayload;
        if (payload.algorithm?.toUpperCase() !== 'HMAC-SHA256') return null;
        if (!payload.user_id || typeof payload.user_id !== 'string') {
            return null;
        }
        return payload;
    } catch {
        return null;
    }
}
