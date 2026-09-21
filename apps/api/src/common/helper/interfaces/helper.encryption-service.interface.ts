export interface IHelperEncryptionService {
    base64Encrypt(data: string): string;
    base64Decrypt(data: string): string;
    base64Compare(basicToken1: string, basicToken2: string): boolean;
    /**
     * Simple reversible AES for NON-SECRET data (opaque cursors, internal
     * reversible payloads). Unauthenticated — provides confidentiality, not integrity.
     * ❌ Do NOT use for tokens, OAuth/refresh credentials, or any secret at rest.
     */
    aes256Encrypt<T = Record<string, any>>(
        data: T,
        key: string,
        iv: string
    ): string;
    /**
     * Simple reversible AES for NON-SECRET data (opaque cursors, internal
     * reversible payloads). Unauthenticated — provides confidentiality, not integrity.
     * ❌ Do NOT use for tokens, OAuth/refresh credentials, or any secret at rest.
     */
    aes256Decrypt<T = Record<string, any>>(
        encrypted: string,
        key: string,
        iv: string
    ): T;
    /**
     * Authenticated, versioned, KMS-ready encryption for SECRETS AT REST
     * (platform OAuth access/refresh tokens, tool credentials).
     * ✅ Use this for anything in the "platform credential" / secret class.
     * envelopeDecrypt transparently handles legacy crypto-js rows.
     */
    envelopeEncrypt(plaintext: string): string;
    /**
     * Authenticated, versioned, KMS-ready decryption for SECRETS AT REST.
     * ✅ Use this for anything in the "platform credential" / secret class.
     * Supports legacy crypto-js rows and additive version dispatch (v2+)
     * so KMS rollout can be an additive branch without data migration.
     */
    envelopeDecrypt(stored: string): string;
    aes256Compare(aes1: string, aes2: string): boolean;
}
