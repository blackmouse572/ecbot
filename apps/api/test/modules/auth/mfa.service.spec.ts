import { BadRequestException } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Test } from '@nestjs/testing';
import { HelperEncryptionService } from '@app/common/helper/services/helper.encryption.service';
import { MfaService } from '@app/modules/auth/services/mfa.service';
import { generateTotp } from '@app/modules/auth/utils/auth.totp.util';
import { UserService } from '@app/modules/user/services/user.service';

describe('MfaService', () => {
    let service: MfaService;

    const cacheStore = new Map<string, unknown>();
    const cache = {
        get: jest.fn(async (key: string) => cacheStore.get(key)),
        set: jest.fn(async (key: string, value: unknown) => {
            cacheStore.set(key, value);
        }),
        del: jest.fn(async (key: string) => {
            cacheStore.delete(key);
        }),
    };
    // Reversible stand-in: proves the stored value is the encrypted form.
    const encryption = {
        envelopeEncrypt: jest.fn((v: string) => `enc(${v})`),
        envelopeDecrypt: jest.fn((v: string) => v.slice(4, -1)),
    };
    const updateMfa = jest.fn(async (user: any, data: any) =>
        Object.assign(user, data)
    );

    const now = 1_700_000_000_000;

    beforeEach(async () => {
        cacheStore.clear();
        jest.clearAllMocks();
        const module = await Test.createTestingModule({
            providers: [
                MfaService,
                { provide: CACHE_MANAGER, useValue: cache },
                { provide: HelperEncryptionService, useValue: encryption },
                { provide: UserService, useValue: { updateMfa } },
            ],
        }).compile();
        service = module.get(MfaService);
    });

    const newUser = (): any => ({
        id: 'user-1',
        email: 'a@b.com',
        mfaEnabled: false,
    });

    async function enabledUser(): Promise<{
        user: any;
        secret: string;
        recoveryCodes: string[];
    }> {
        const user = newUser();
        const { secret } = await service.setup(user);
        const { recoveryCodes } = await service.enable(
            user,
            generateTotp(secret, now),
            now
        );
        return { user, secret, recoveryCodes };
    }

    it('stores a new secret encrypted and pending, and returns the otpauth URI', async () => {
        const user = newUser();
        const result = await service.setup(user);

        expect(result.secret).toMatch(/^[A-Z2-7]{32}$/);
        expect(result.otpauthUri).toContain(`secret=${result.secret}`);
        expect(result.otpauthUri).toContain('issuer=Eccho');
        expect(updateMfa).toHaveBeenCalledWith(user, {
            mfaPendingSecret: `enc(${result.secret})`,
        });
        expect(user.mfaEnabled).toBe(false);
    });

    it('enables MFA with a valid code and returns 10 recovery codes stored only as hashes', async () => {
        const { user, recoveryCodes } = await enabledUser();

        expect(user.mfaEnabled).toBe(true);
        expect(user.mfaPendingSecret).toBeNull();
        expect(user.mfaSecret).toMatch(/^enc\(/);
        expect(recoveryCodes).toHaveLength(10);
        expect(new Set(recoveryCodes).size).toBe(10);
        expect(user.mfaRecoveryCodes).toHaveLength(10);
        for (const code of recoveryCodes) {
            expect(user.mfaRecoveryCodes).not.toContain(code);
        }
    });

    it('refuses to enable with a wrong code or without a pending setup', async () => {
        const user = newUser();
        await expect(service.enable(user, '000000', now)).rejects.toThrow(
            BadRequestException
        );

        await service.setup(user);
        await expect(service.enable(user, 'abcdef', now)).rejects.toThrow(
            BadRequestException
        );
        expect(user.mfaEnabled).toBe(false);
    });

    it('accepts a TOTP code once, then refuses the same code (replay)', async () => {
        const { user, secret } = await enabledUser();
        const later = now + 30_000;
        const code = generateTotp(secret, later);

        expect(await service.verify(user, code, later)).toBe(true);
        expect(await service.verify(user, code, later)).toBe(false);
    });

    it('accepts each recovery code exactly once, in any letter case or dash format', async () => {
        const { user, recoveryCodes } = await enabledUser();
        const [first, second] = recoveryCodes;

        expect(await service.verify(user, first, now)).toBe(true);
        expect(user.mfaRecoveryCodes).toHaveLength(9);
        expect(await service.verify(user, first, now)).toBe(false);

        expect(
            await service.verify(
                user,
                ` ${second.replace('-', '').toUpperCase()} `,
                now
            )
        ).toBe(true);
        expect(user.mfaRecoveryCodes).toHaveLength(8);
    });

    it('refuses any code when MFA is off', async () => {
        expect(await service.verify(newUser(), '123456', now)).toBe(false);
    });

    it('clears every MFA field on disable', async () => {
        const { user } = await enabledUser();
        await service.disable(user);

        expect(updateMfa).toHaveBeenLastCalledWith(user, {
            mfaEnabled: false,
            mfaSecret: null,
            mfaPendingSecret: null,
            mfaRecoveryCodes: null,
            mfaLastTimeStep: null,
        });
    });

    it('issues an opaque challenge that resolves until deleted', async () => {
        const token = await service.createChallenge({
            user: 'user-1',
            rememberMe: true,
        });

        expect(token).toMatch(/^[\w-]{43}$/);
        expect(await service.findChallenge(token)).toEqual({
            user: 'user-1',
            rememberMe: true,
        });
        expect(cache.set).toHaveBeenCalledWith(
            expect.any(String),
            expect.anything(),
            300_000
        );

        await service.deleteChallenge(token);
        expect(await service.findChallenge(token)).toBeNull();
    });
});
