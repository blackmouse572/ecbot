import { raw } from '@mikro-orm/postgresql';
import { UserRepository } from '@app/modules/user/repository/repositories/user.repository';

jest.mock('@mikro-orm/postgresql', () => {
    const actual = jest.requireActual('@mikro-orm/postgresql');
    return {
        ...actual,
        raw: jest.fn((sql: string, params?: unknown[]) => ({ sql, params })),
    };
});

describe('UserRepository conditional MFA updates', () => {
    const nativeUpdate = jest.fn();
    const repository = new UserRepository({ nativeUpdate } as any);

    beforeEach(() => {
        nativeUpdate.mockReset();
    });

    it('claims a password attempt only below the cap, in one UPDATE', async () => {
        nativeUpdate.mockResolvedValueOnce(1).mockResolvedValueOnce(0);

        await expect(repository.claimPasswordAttempt('u1', 5)).resolves.toBe(
            true
        );
        await expect(repository.claimPasswordAttempt('u1', 5)).resolves.toBe(
            false
        );
        const [, filter, data] = nativeUpdate.mock.calls[0];
        expect(filter).toEqual({ id: 'u1', passwordAttempt: { $lt: 5 } });
        expect(data.passwordAttempt).toEqual({
            sql: 'password_attempt + 1',
            params: undefined,
        });
    });

    it('accepts a TOTP step only when no later or equal step was used', async () => {
        nativeUpdate.mockResolvedValueOnce(1);

        await expect(repository.claimMfaTimeStep('u1', 42)).resolves.toBe(true);
        expect(nativeUpdate).toHaveBeenCalledWith(
            expect.anything(),
            {
                id: 'u1',
                mfaEnabled: true,
                $or: [
                    { mfaLastTimeStep: null },
                    { mfaLastTimeStep: { $lt: 42 } },
                ],
            },
            { mfaLastTimeStep: 42 }
        );
    });

    it('removes a recovery code only if it is still there', async () => {
        nativeUpdate.mockResolvedValueOnce(0);

        await expect(
            repository.consumeMfaRecoveryCode('u1', 'hash')
        ).resolves.toBe(false);
        expect(raw).toHaveBeenCalledWith(
            'mfa_recovery_codes @> jsonb_build_array(cast(? as text))',
            ['hash']
        );
        expect(raw).toHaveBeenCalledWith(
            'mfa_recovery_codes - cast(? as text)',
            ['hash']
        );
    });
});
