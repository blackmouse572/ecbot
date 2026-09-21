import { EntityManager } from '@mikro-orm/postgresql';
import { ConfigService } from '@nestjs/config';
import { AccountRepository } from 'src/modules/account/repository/repositories/account.repository';
import { HelperEncryptionService } from 'src/common/helper/services/helper.encryption.service';
import { MigrationAccountTokenReencryptSeed } from 'src/migration/seeds/migration.account-token-reencrypt.seed';

const LEGACY_CIPHER = 'U2FsdGVkX1+legacy';
const PLAINTEXT_TOKEN = 'EAAB-raw-platform-token';
const ENVELOPED_TOKEN = 'v1:v1:iv:tag:cipher';

describe('MigrationAccountTokenReencryptSeed', () => {
    let rows: Array<{ id: string; accessToken: string; refreshToken?: string }>;
    let accountRepository: { find: jest.Mock; save: jest.Mock };
    let helperEncryption: {
        envelopeEncrypt: jest.Mock;
        envelopeDecrypt: jest.Mock;
    };
    let em: { fork: jest.Mock };
    let configService: { get: jest.Mock };
    let seed: MigrationAccountTokenReencryptSeed;

    beforeEach(() => {
        rows = [
            { id: 'legacy-row', accessToken: LEGACY_CIPHER },
            { id: 'plaintext-row', accessToken: PLAINTEXT_TOKEN },
            { id: 'enveloped-row', accessToken: ENVELOPED_TOKEN },
        ];

        em = { fork: jest.fn().mockReturnValue({ id: 'forked-em' }) };

        accountRepository = {
            find: jest.fn().mockResolvedValue(rows),
            save: jest
                .fn()
                .mockImplementation(entity => Promise.resolve(entity)),
        };

        helperEncryption = {
            envelopeEncrypt: jest.fn(
                (value: string) => `v1:v1:iv:tag:${value}`
            ),
            // Mirrors the real helper: a legacy crypto-js row decrypts back to
            // the token, anything that was never encrypted throws in JSON.parse.
            envelopeDecrypt: jest.fn((value: string) => {
                if (value === LEGACY_CIPHER) return 'legacy-plain-token';
                throw new SyntaxError('Unexpected end of JSON input');
            }),
        };

        configService = {
            get: jest.fn((key: string) =>
                key === 'oauth.tokenEncryptKey'
                    ? 'a'.repeat(64)
                    : key === 'oauth.tokenEncryptIv'
                      ? 'aaaabbbbccccdddd'
                      : undefined
            ),
        };

        seed = new MigrationAccountTokenReencryptSeed(
            em as unknown as EntityManager,
            accountRepository as unknown as AccountRepository,
            helperEncryption as unknown as HelperEncryptionService,
            configService as unknown as ConfigService
        );
    });

    it('counts one legacy, one plaintext and one already-enveloped row', async () => {
        const counts = await seed.reencryptTokens(false);

        expect(counts).toEqual({
            legacy: 1,
            plaintext: 1,
            alreadyEnveloped: 1,
        });
    });

    // The CLI runs outside any request, so the global EM is disallowed
    // (DatabaseOptionService.allowGlobalContext=false) — every read and write
    // must go through a fork.
    it('runs every read and write on a forked entity manager', async () => {
        await seed.reencryptTokens(false);

        expect(em.fork).toHaveBeenCalled();
        expect(accountRepository.find).toHaveBeenCalledWith(undefined, {
            em: { id: 'forked-em' },
        });
        for (const call of accountRepository.save.mock.calls) {
            expect(call[1]).toEqual({ em: { id: 'forked-em' } });
        }
    });

    it('re-encrypts the decrypted value for a legacy row', async () => {
        await seed.reencryptTokens(false);

        expect(helperEncryption.envelopeEncrypt).toHaveBeenCalledWith(
            'legacy-plain-token'
        );
        expect(rows[0].accessToken).toBe('v1:v1:iv:tag:legacy-plain-token');
    });

    it('encrypts the stored value as-is for a plaintext row', async () => {
        await seed.reencryptTokens(false);

        expect(helperEncryption.envelopeEncrypt).toHaveBeenCalledWith(
            PLAINTEXT_TOKEN
        );
        expect(rows[1].accessToken).toBe(`v1:v1:iv:tag:${PLAINTEXT_TOKEN}`);
    });

    it('leaves an already-enveloped row untouched and does not save it', async () => {
        await seed.reencryptTokens(false);

        expect(rows[2].accessToken).toBe(ENVELOPED_TOKEN);
        expect(accountRepository.save).toHaveBeenCalledTimes(2);
        expect(helperEncryption.envelopeDecrypt).not.toHaveBeenCalledWith(
            ENVELOPED_TOKEN
        );
    });

    it('also covers refreshToken', async () => {
        rows.push({
            id: 'refresh-row',
            accessToken: ENVELOPED_TOKEN,
            refreshToken: PLAINTEXT_TOKEN,
        });

        const counts = await seed.reencryptTokens(false);

        expect(counts).toEqual({
            legacy: 1,
            plaintext: 2,
            alreadyEnveloped: 2,
        });
        expect(rows[3].refreshToken).toBe(`v1:v1:iv:tag:${PLAINTEXT_TOKEN}`);
    });

    it('writes nothing under --dry-run but still reports the counts', async () => {
        const counts = await seed.reencryptTokens(true);

        expect(counts).toEqual({
            legacy: 1,
            plaintext: 1,
            alreadyEnveloped: 1,
        });
        expect(accountRepository.save).not.toHaveBeenCalled();
        expect(rows[0].accessToken).toBe(LEGACY_CIPHER);
        expect(rows[1].accessToken).toBe(PLAINTEXT_TOKEN);
    });

    // A present-but-wrong legacy key makes the legacy decrypt throw, which is
    // misread as plaintext and wrapped irreversibly — refuse instead of
    // corrupting every legacy row.
    it('rejects when the encrypt key or IV is missing, without touching the repository', async () => {
        configService.get.mockReturnValue(undefined);

        await expect(seed.reencryptTokens(false)).rejects.toThrow(
            'OAUTH_TOKEN_ENCRYPT_KEY and OAUTH_TOKEN_ENCRYPT_IV must be set'
        );
        expect(accountRepository.find).not.toHaveBeenCalled();
        expect(accountRepository.save).not.toHaveBeenCalled();
    });
});
