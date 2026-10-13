import { createHmac } from 'crypto';
import { parseFacebookSignedRequest } from '../../../src/common/facebook/utils/facebook-signed-request.util';

const APP_SECRET = 'test-app-secret';

function base64Url(input: Buffer | string): string {
    return Buffer.from(input)
        .toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');
}

function sign(payload: object, secret = APP_SECRET): string {
    const encodedPayload = base64Url(JSON.stringify(payload));
    const signature = createHmac('sha256', secret)
        .update(encodedPayload)
        .digest();
    return `${base64Url(signature)}.${encodedPayload}`;
}

describe('parseFacebookSignedRequest', () => {
    const payload = {
        algorithm: 'HMAC-SHA256',
        issued_at: 1791723682,
        user_id: '1234567890',
    };

    it('returns the payload when the signature matches the app secret', () => {
        expect(parseFacebookSignedRequest(sign(payload), APP_SECRET)).toEqual(
            payload
        );
    });

    it('rejects a request signed with another secret', () => {
        expect(
            parseFacebookSignedRequest(sign(payload, 'other'), APP_SECRET)
        ).toBeNull();
    });

    it('rejects a payload that was changed after signing', () => {
        const [signature] = sign(payload).split('.');
        const forged = base64Url(
            JSON.stringify({ ...payload, user_id: 'someone-else' })
        );
        expect(
            parseFacebookSignedRequest(`${signature}.${forged}`, APP_SECRET)
        ).toBeNull();
    });

    it('rejects an algorithm other than HMAC-SHA256', () => {
        expect(
            parseFacebookSignedRequest(
                sign({ ...payload, algorithm: 'none' }),
                APP_SECRET
            )
        ).toBeNull();
    });

    it.each(['', 'no-dot', 'a.b.c', '.', 'abc.not-json'])(
        'rejects the malformed value %p',
        value => {
            expect(parseFacebookSignedRequest(value, APP_SECRET)).toBeNull();
        }
    );

    it.each([undefined, null, 42, ['a.b'], { a: 'b' }])(
        'rejects the non-string value %p instead of throwing',
        value => {
            expect(parseFacebookSignedRequest(value, APP_SECRET)).toBeNull();
        }
    );

    it('rejects a validly signed payload that is not JSON', () => {
        const encodedPayload = base64Url('not json');
        const signature = createHmac('sha256', APP_SECRET)
            .update(encodedPayload)
            .digest();
        expect(
            parseFacebookSignedRequest(
                `${base64Url(signature)}.${encodedPayload}`,
                APP_SECRET
            )
        ).toBeNull();
    });

    it.each([undefined, '', 1234567890, { $ne: null }])(
        'rejects a signed payload whose user_id is %p',
        userId => {
            expect(
                parseFacebookSignedRequest(
                    sign({ ...payload, user_id: userId }),
                    APP_SECRET
                )
            ).toBeNull();
        }
    );

    it('rejects everything when the app secret is not configured', () => {
        expect(parseFacebookSignedRequest(sign(payload), '')).toBeNull();
    });
});
