import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AES, enc, mode, pad } from 'crypto-js';
import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
import { TokenEncryptionError } from 'src/common/helper/exceptions/token-encryption.exception';
import { IHelperEncryptionService } from 'src/common/helper/interfaces/helper.encryption-service.interface';

/** Prefix every envelope-encrypted value at rest carries. */
export const ENVELOPE_TOKEN_PREFIX = 'v1:';

@Injectable()
export class HelperEncryptionService implements IHelperEncryptionService {
    constructor(private readonly configService: ConfigService) {}

    base64Encrypt(data: string): string {
        const buff: Buffer = Buffer.from(data, 'utf8');
        return buff.toString('base64');
    }

    base64Decrypt(data: string): string {
        const buff: Buffer = Buffer.from(data, 'base64');
        return buff.toString('utf8');
    }

    base64Compare(basicToken1: string, basicToken2: string): boolean {
        return basicToken1 === basicToken2;
    }

    /**
     * Simple reversible AES for NON-SECRET data (opaque cursors, internal
     * reversible payloads). Unauthenticated — provides confidentiality, not integrity.
     * ❌ Do NOT use for tokens, OAuth/refresh credentials, or any secret at rest.
     */
    aes256Encrypt<T = Record<string, any>>(
        data: T,
        key: string,
        iv: string
    ): string {
        const cIv = enc.Utf8.parse(iv);
        const cipher = AES.encrypt(JSON.stringify(data), key, {
            mode: mode.CBC,
            padding: pad.Pkcs7,
            iv: cIv,
        });

        return cipher.toString();
    }

    /**
     * Simple reversible AES for NON-SECRET data (opaque cursors, internal
     * reversible payloads). Unauthenticated — provides confidentiality, not integrity.
     * ❌ Do NOT use for tokens, OAuth/refresh credentials, or any secret at rest.
     */
    aes256Decrypt<T = Record<string, any>>(
        encrypted: string,
        key: string,
        iv: string
    ): T {
        const cIv = enc.Utf8.parse(iv);
        const cipher = AES.decrypt(encrypted, key, {
            mode: mode.CBC,
            padding: pad.Pkcs7,
            iv: cIv,
        });

        return JSON.parse(cipher.toString(enc.Utf8));
    }

    aes256Compare(aes1: string, aes2: string): boolean {
        return aes1 === aes2;
    }

    /**
     * Authenticated, versioned, KMS-ready encryption for SECRETS AT REST
     * (platform OAuth access/refresh tokens, tool credentials).
     * ✅ Use this for anything in the "platform credential" / secret class.
     * envelopeDecrypt transparently handles legacy crypto-js rows.
     */
    envelopeEncrypt(plaintext: string): string {
        if (!plaintext) return plaintext;

        const defaultKeyId =
            this.configService.get<string>('oauth.tokenEncryptDefaultKeyId') ??
            'v1';
        const key = this.getEnvelopeKey(defaultKeyId);
        const iv = randomBytes(12);
        const cipher = createCipheriv('aes-256-gcm', key, iv);
        const ciphertext = Buffer.concat([
            cipher.update(plaintext, 'utf8'),
            cipher.final(),
        ]);
        const authTag = cipher.getAuthTag();

        return `v1:${defaultKeyId}:${iv.toString('base64')}:${authTag.toString(
            'base64'
        )}:${ciphertext.toString('base64')}`;
    }

    /**
     * Authenticated, versioned, KMS-ready decryption for SECRETS AT REST.
     * ✅ Use this for anything in the "platform credential" / secret class.
     * Supports legacy crypto-js rows and additive version dispatch (v2+)
     * so KMS rollout can be an additive branch without data migration.
     */
    envelopeDecrypt(stored: string): string {
        if (!stored) return stored;

        if (stored.startsWith(ENVELOPE_TOKEN_PREFIX)) {
            const [version, keyId, ivB64, authTagB64, ciphertextB64, ...extra] =
                stored.split(':');

            if (
                version !== 'v1' ||
                !keyId ||
                !ivB64 ||
                !authTagB64 ||
                !ciphertextB64 ||
                extra.length
            ) {
                throw new TokenEncryptionError(
                    'invalid_format',
                    'Invalid envelope format'
                );
            }

            const key = this.getEnvelopeKey(keyId);
            const iv = Buffer.from(ivB64, 'base64');
            const authTag = Buffer.from(authTagB64, 'base64');
            const ciphertext = Buffer.from(ciphertextB64, 'base64');

            if (iv.length !== 12 || authTag.length !== 16) {
                throw new TokenEncryptionError(
                    'invalid_format',
                    'Invalid envelope IV or auth tag length'
                );
            }

            const decipher = createDecipheriv('aes-256-gcm', key, iv);
            decipher.setAuthTag(authTag);

            try {
                const decrypted = Buffer.concat([
                    decipher.update(ciphertext),
                    decipher.final(),
                ]);
                return decrypted.toString('utf8');
            } catch (error) {
                throw new TokenEncryptionError(
                    'auth_failed',
                    'Envelope authentication failed',
                    { cause: error }
                );
            }
        }

        if (/^v\d+:/.test(stored)) {
            throw new TokenEncryptionError(
                'unsupported_version',
                'Unsupported envelope version'
            );
        }

        const key = this.configService.get<string>('oauth.tokenEncryptKey');
        const iv = this.configService.get<string>('oauth.tokenEncryptIv');
        return this.aes256Decrypt<string>(stored, key, iv);
    }

    private getEnvelopeKey(keyId: string): Buffer {
        const configuredKeys =
            this.configService.get<Record<string, string>>(
                'oauth.tokenEncryptKeys'
            ) ?? {};
        const rawKey = configuredKeys[keyId] || this.getLegacyV1Key(keyId);

        if (!rawKey) {
            throw new TokenEncryptionError(
                'key_not_found',
                `Encryption key not found for keyId "${keyId}"`
            );
        }

        const key = Buffer.from(rawKey, 'hex');
        if (key.length !== 32) {
            throw new TokenEncryptionError(
                'key_length',
                `Encryption key "${keyId}" must be exactly 32 bytes for AES-256-GCM`
            );
        }

        return key;
    }

    private getLegacyV1Key(keyId: string): string | undefined {
        if (keyId !== 'v1') return undefined;
        return this.configService.get<string>('oauth.tokenEncryptKey');
    }
}
