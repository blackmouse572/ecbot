/**
 * Why an envelope encrypt/decrypt failed.
 * `key_not_found` and `key_length` are operator/deploy misconfigurations
 * (a missing or wrong-length OAUTH_TOKEN_ENCRYPT_KEY) affecting every row
 * alike. `invalid_format`, `unsupported_version` and `auth_failed` are
 * per-row data faults - that specific value was malformed, encrypted under
 * another key, or tampered with.
 */
export type TokenEncryptionErrorReason =
    | 'key_not_found'
    | 'key_length'
    | 'invalid_format'
    | 'unsupported_version'
    | 'auth_failed';

export class TokenEncryptionError extends Error {
    constructor(
        readonly reason: TokenEncryptionErrorReason,
        message: string,
        options?: ErrorOptions
    ) {
        super(message, options);
        this.name = 'TokenEncryptionError';
    }
}
