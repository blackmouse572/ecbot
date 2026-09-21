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

        it('throws key_not_found when the envelope keyId is not configured', () => {
            const service = buildService();

            try {
                service.envelopeDecrypt(envelopeWithKeyId('never-configured'));
                throw new Error('expected envelopeDecrypt to throw');
            } catch (error) {
                expect(error).toBeInstanceOf(TokenEncryptionError);
                expect((error as TokenEncryptionError).reason).toBe(
                    'key_not_found'
                );
                expect((error as TokenEncryptionError).message).toBe(
                    'Encryption key not found for keyId "never-configured"'
                );
            }
        });

        it('throws key_length when the configured key is not 32 bytes', () => {
            const service = buildService();

            try {
                service.envelopeDecrypt(envelopeWithKeyId('short'));
                throw new Error('expected envelopeDecrypt to throw');
            } catch (error) {
                expect(error).toBeInstanceOf(TokenEncryptionError);
                expect((error as TokenEncryptionError).reason).toBe(
                    'key_length'
                );
                expect((error as TokenEncryptionError).message).toBe(
                    'Encryption key "short" must be exactly 32 bytes for AES-256-GCM'
                );
            }
        });

        it('throws invalid_format when the envelope is malformed', () => {
            const service = buildService();

            try {
                service.envelopeDecrypt('v1:v1:missing-the-rest');
                throw new Error('expected envelopeDecrypt to throw');
            } catch (error) {
                expect(error).toBeInstanceOf(TokenEncryptionError);
                expect((error as TokenEncryptionError).reason).toBe(
                    'invalid_format'
                );
                expect((error as TokenEncryptionError).message).toBe(
                    'Invalid envelope format'
                );
            }

            // Same reason for a well-shaped envelope with a bad IV/auth tag size.
            try {
                service.envelopeDecrypt(
                    ['v1', 'v1', 'AAAA', 'AAAA', 'AAAA'].join(':')
                );
                throw new Error('expected envelopeDecrypt to throw');
            } catch (error) {
                expect(error).toBeInstanceOf(TokenEncryptionError);
                expect((error as TokenEncryptionError).reason).toBe(
                    'invalid_format'
                );
            }
        });

        it('throws unsupported_version for a future envelope version', () => {
            const service = buildService();

            try {
                service.envelopeDecrypt(
                    'v2:v1:AAAAAAAAAAAAAAAA:AAAAAAAAAAAAAAAAAAAAAA==:AAAAAAAAAAAAAAAAAAAAAA=='
                );
                throw new Error('expected envelopeDecrypt to throw');
            } catch (error) {
                expect(error).toBeInstanceOf(TokenEncryptionError);
                expect((error as TokenEncryptionError).reason).toBe(
                    'unsupported_version'
                );
                expect((error as TokenEncryptionError).message).toBe(
                    'Unsupported envelope version'
                );
            }
        });

        it('throws auth_failed when the ciphertext does not authenticate', () => {
            const service = buildService();
            const parts = service
                .envelopeEncrypt('super-secret-token')
                .split(':');
            parts[4] = Buffer.from('tampered-ciphertext').toString('base64');

            try {
                service.envelopeDecrypt(parts.join(':'));
                throw new Error('expected envelopeDecrypt to throw');
            } catch (error) {
                expect(error).toBeInstanceOf(TokenEncryptionError);
                expect((error as TokenEncryptionError).reason).toBe(
                    'auth_failed'
                );
            }
        });

        // The #384 backfill detects plaintext rows by attempting a legacy
        // decrypt, so that failure must stay an untyped error - a
        // TokenEncryptionError there would be read as an operator fault.
        it('does not type a legacy/plaintext decrypt failure as TokenEncryptionError', () => {
            const service = buildService();

            try {
                service.envelopeDecrypt('EAAB-raw-platform-token');
                throw new Error('expected envelopeDecrypt to throw');
            } catch (error) {
                expect(error).not.toBeInstanceOf(TokenEncryptionError);
            }
        });
    });
});
