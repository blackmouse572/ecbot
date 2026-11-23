import { ConfigService } from '@nestjs/config';
import { TokenEncryptionError } from '../../../../src/common/helper/exceptions/token-encryption.exception';
import { HelperEncryptionService } from '../../../../src/common/helper/services/helper.encryption.service';

describe('HelperEncryptionService envelope encryption', () => {
    // 64 hex chars = 32 bytes for AES-256-GCM
    const tokenEncryptKey = 'a'.repeat(64);
    const tokenEncryptIv = 'aaaabbbbccccdddd';

    const configValues: Record<string, any> = {
        'oauth.tokenEncryptDefaultKeyId': 'v1',
        'oauth.tokenEncryptKeys': {
            v1: tokenEncryptKey,
            rotated: '1'.repeat(64),
            short: 'abcd',
        },
        'oauth.tokenEncryptKey': tokenEncryptKey,
        'oauth.tokenEncryptIv': tokenEncryptIv,
    };

    const mockConfigService = {
        get: jest.fn((key: string) => configValues[key]),
    } as unknown as ConfigService;

    const buildService = () => new HelperEncryptionService(mockConfigService);

    beforeEach(() => {
        jest.clearAllMocks();
        configValues['oauth.tokenEncryptDefaultKeyId'] = 'v1';
    });

    it('encrypts/decrypts using v1 envelope format', () => {
        const service = buildService();

        const encrypted = service.envelopeEncrypt('super-secret-token');
        const decrypted = service.envelopeDecrypt(encrypted);

        expect(encrypted).toMatch(/^v1:v1:[^:]+:[^:]+:[^:]+$/);
        expect(decrypted).toBe('super-secret-token');
    });

    it('uses random IV for each encryption call', () => {
        const service = buildService();

        const encrypted1 = service.envelopeEncrypt('same-token');
        const encrypted2 = service.envelopeEncrypt('same-token');

        expect(encrypted1).not.toBe(encrypted2);
    });

    it('throws when ciphertext is tampered', () => {
        const service = buildService();
        const encrypted = service.envelopeEncrypt('super-secret-token');
        const parts = encrypted.split(':');

        parts[4] = Buffer.from('tampered-ciphertext').toString('base64');

        expect(() => service.envelopeDecrypt(parts.join(':'))).toThrow();
    });

    it('throws when auth tag is tampered', () => {
        const service = buildService();
        const encrypted = service.envelopeEncrypt('super-secret-token');
        const parts = encrypted.split(':');

        parts[3] = Buffer.from('tampered-auth-tag').toString('base64');

        expect(() => service.envelopeDecrypt(parts.join(':'))).toThrow();
    });

    it('decrypts legacy crypto-js encrypted values', () => {
        const service = buildService();
        const legacyEncrypted = service.aes256Encrypt(
            'legacy-secret-token',
            tokenEncryptKey,
            tokenEncryptIv
        );

        expect(service.envelopeDecrypt(legacyEncrypted)).toBe(
            'legacy-secret-token'
        );
    });

    it('supports configured default key ID in v1 envelope', () => {
        const service = buildService();
        configValues['oauth.tokenEncryptDefaultKeyId'] = 'rotated';

        const encrypted = service.envelopeEncrypt('super-secret-token');

        expect(encrypted).toMatch(/^v1:rotated:/);
        expect(service.envelopeDecrypt(encrypted)).toBe('super-secret-token');
    });

    // The #384 backfill (`account:reencrypt-tokens`) tells a legacy row from a
    // plaintext one by attempting the decrypt. Lock that behaviour in: a legacy
    // ciphertext returns the token, a raw token throws.
    it('throws when a never-encrypted plaintext value is decrypted', () => {
        const service = buildService();

        expect(() =>
            service.envelopeDecrypt('EAAB-raw-platform-token')
        ).toThrow();
    });

    it('throws for unsupported envelope versions', () => {
        const service = buildService();

        expect(() =>
            service.envelopeDecrypt(
                'v2:v1:AAAAAAAAAAAAAAAA:AAAAAAAAAAAAAAAAAAAAAA==:AAAAAAAAAAAAAAAAAAAAAA=='
            )
        ).toThrow('Unsupported envelope version');
    });
    // #384 S-12: the refresh cron must tell an operator misconfiguration (wrong
    // or missing OAUTH_TOKEN_ENCRYPT_KEY) from a per-row data fault, so every
    // envelope throw site carries a typed `reason`.
    describe('typed decryption faults', () => {
        const envelopeWithKeyId = (keyId: string) =>
            [
                'v1',
                keyId,
                Buffer.alloc(12).toString('base64'),
                Buffer.alloc(16).toString('base64'),
                Buffer.alloc(8).toString('base64'),
            ].join(':');

        // What fn threw. Throwing nothing fails the test, so an assertion on
        // the result can never be skipped (a catch block would be).
        const thrownBy = (fn: () => unknown): unknown => {
            try {
                fn();
            } catch (error) {
                return error;
            }
            throw new Error('expected the call to throw');
        };

        it('throws key_not_found when the envelope keyId is not configured', () => {
            const service = buildService();

            const error = thrownBy(() =>
                service.envelopeDecrypt(envelopeWithKeyId('never-configured'))
            );
            expect(error).toBeInstanceOf(TokenEncryptionError);
            expect(error).toMatchObject({
                reason: 'key_not_found',
                message:
                    'Encryption key not found for keyId "never-configured"',
            });
        });

        it('throws key_length when the configured key is not 32 bytes', () => {
            const service = buildService();

            const error = thrownBy(() =>
                service.envelopeDecrypt(envelopeWithKeyId('short'))
            );
            expect(error).toBeInstanceOf(TokenEncryptionError);
            expect(error).toMatchObject({
                reason: 'key_length',
                message:
                    'Encryption key "short" must be exactly 32 bytes for AES-256-GCM',
            });
        });

        it('throws invalid_format when the envelope is malformed', () => {
            const service = buildService();

            const malformed = thrownBy(() =>
                service.envelopeDecrypt('v1:v1:missing-the-rest')
            );
            expect(malformed).toBeInstanceOf(TokenEncryptionError);
            expect(malformed).toMatchObject({
                reason: 'invalid_format',
                message: 'Invalid envelope format',
            });

            // Same reason for a well-shaped envelope with a bad IV/auth tag size.
            const badSizes = thrownBy(() =>
                service.envelopeDecrypt(
                    ['v1', 'v1', 'AAAA', 'AAAA', 'AAAA'].join(':')
                )
            );
            expect(badSizes).toBeInstanceOf(TokenEncryptionError);
            expect(badSizes).toMatchObject({ reason: 'invalid_format' });
        });

        it('throws unsupported_version for a future envelope version', () => {
            const service = buildService();

            const error = thrownBy(() =>
                service.envelopeDecrypt(
                    'v2:v1:AAAAAAAAAAAAAAAA:AAAAAAAAAAAAAAAAAAAAAA==:AAAAAAAAAAAAAAAAAAAAAA=='
                )
            );
            expect(error).toBeInstanceOf(TokenEncryptionError);
            expect(error).toMatchObject({
                reason: 'unsupported_version',
                message: 'Unsupported envelope version',
            });
        });

        it('throws auth_failed when the ciphertext does not authenticate', () => {
            const service = buildService();
            const parts = service
                .envelopeEncrypt('super-secret-token')
                .split(':');
            parts[4] = Buffer.from('tampered-ciphertext').toString('base64');

            const error = thrownBy(() =>
                service.envelopeDecrypt(parts.join(':'))
            );
            expect(error).toBeInstanceOf(TokenEncryptionError);
            expect(error).toMatchObject({ reason: 'auth_failed' });
        });

        // The #384 backfill detects plaintext rows by attempting a legacy
        // decrypt, so that failure must stay an untyped error - a
        // TokenEncryptionError there would be read as an operator fault.
        it('does not type a legacy/plaintext decrypt failure as TokenEncryptionError', () => {
            const service = buildService();

            const error = thrownBy(() =>
                service.envelopeDecrypt('EAAB-raw-platform-token')
            );
            expect(error).not.toBeInstanceOf(TokenEncryptionError);
        });
    });
});
