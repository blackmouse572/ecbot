import { Test } from '@nestjs/testing';
import { AuthMfaSharedController } from '@app/modules/auth/controllers/auth.mfa.shared.controller';
import { AuthService } from '@app/modules/auth/services/auth.service';
import { MfaService } from '@app/modules/auth/services/mfa.service';
import { ActivityService } from '@app/modules/activity/services/activity.service';
import { UserService } from '@app/modules/user/services/user.service';
import { ENUM_AUTH_STATUS_CODE_ERROR } from '@app/modules/auth/enums/auth.status-code.enum';
import { ENUM_USER_STATUS_CODE_ERROR } from '@app/modules/user/enums/user.status-code.enum';

describe('AuthMfaSharedController', () => {
    let controller: AuthMfaSharedController;

    const authService = {
        getPasswordAttempt: jest.fn(() => true),
        getPasswordMaxAttempt: jest.fn(() => 5),
        validateUser: jest.fn(),
    };
    const mfaService = {
        setup: jest.fn(),
        enable: jest.fn(),
        disable: jest.fn(),
        verify: jest.fn(),
        regenerateRecoveryCodes: jest.fn(),
        revokeSessionsAndNotify: jest.fn(),
        invalidCodeError: jest.fn(
            () => new Error('auth.error.mfaCodeInvalid') as any
        ),
    };
    // The stored attempt counter; claims model the conditional UPDATE.
    let storedAttempts: number;
    const userService = {
        claimPasswordAttempt: jest.fn(async (_user: any, max: number) => {
            if (storedAttempts >= max) return false;
            storedAttempts++;
            return true;
        }),
        clearPasswordAttempt: jest.fn(async () => {
            storedAttempts = 0;
        }),
    };
    const activityService = { createByUser: jest.fn() };

    let user: any;

    beforeEach(async () => {
        jest.clearAllMocks();
        storedAttempts = 0;
        user = {
            id: 'u1',
            password: 'hash',
            passwordAttempt: 0,
            mfaEnabled: true,
        };
        const module = await Test.createTestingModule({
            controllers: [AuthMfaSharedController],
            providers: [
                { provide: AuthService, useValue: authService },
                { provide: MfaService, useValue: mfaService },
                { provide: UserService, useValue: userService },
                { provide: ActivityService, useValue: activityService },
            ],
        }).compile();
        controller = module.get(AuthMfaSharedController);
    });

    describe('setup', () => {
        it('needs the current password', async () => {
            user.mfaEnabled = false;
            authService.validateUser.mockResolvedValue(false);

            await expect(
                controller.setup(user, { password: 'bad' })
            ).rejects.toMatchObject({
                response: {
                    statusCode: ENUM_USER_STATUS_CODE_ERROR.PASSWORD_NOT_MATCH,
                },
            });
            expect(mfaService.setup).not.toHaveBeenCalled();
            expect(storedAttempts).toBe(1);
        });

        it('starts setup with the right password and clears the count', async () => {
            user.mfaEnabled = false;
            storedAttempts = 2;
            authService.validateUser.mockResolvedValue(true);
            mfaService.setup.mockResolvedValue({
                secret: 'S',
                otpauthUri: 'u',
            });

            const result = await controller.setup(user, { password: 'pass' });

            expect(result.data).toEqual({ secret: 'S', otpauthUri: 'u' });
            expect(storedAttempts).toBe(0);
        });
    });

    describe('enable', () => {
        it('needs the current password before checking the code', async () => {
            authService.validateUser.mockResolvedValue(false);

            await expect(
                controller.enable(user, 's1', {
                    password: 'bad',
                    code: '123456',
                })
            ).rejects.toMatchObject({
                response: {
                    statusCode: ENUM_USER_STATUS_CODE_ERROR.PASSWORD_NOT_MATCH,
                },
            });
            expect(mfaService.enable).not.toHaveBeenCalled();
        });

        it('returns the recovery codes, signs out other sessions and emails the user', async () => {
            authService.validateUser.mockResolvedValue(true);
            mfaService.enable.mockResolvedValue({ recoveryCodes: ['a-b'] });

            const result = await controller.enable(
                user,
                's1',
                { password: 'pass', code: '123456' },
                'vi'
            );

            expect(mfaService.enable).toHaveBeenCalledWith(user, '123456');
            expect(result.data).toEqual({ recoveryCodes: ['a-b'] });
            expect(mfaService.revokeSessionsAndNotify).toHaveBeenCalledWith(
                user,
                true,
                { keepSession: 's1', language: 'vi' }
            );
            expect(activityService.createByUser).toHaveBeenCalledWith(
                user,
                expect.objectContaining({
                    metadata: { id: 'u1', mfa: 'enabled' },
                })
            );
        });
    });

    describe('disable', () => {
        it('disables MFA with the right password and a valid code, keeping this session', async () => {
            authService.validateUser.mockResolvedValue(true);
            mfaService.verify.mockResolvedValue('totp');

            await controller.disable(user, 's1', {
                password: 'pass',
                code: '123456',
            });

            expect(mfaService.disable).toHaveBeenCalledWith(user);
            expect(mfaService.revokeSessionsAndNotify).toHaveBeenCalledWith(
                user,
                false,
                { keepSession: 's1', language: undefined }
            );
            expect(storedAttempts).toBe(0);
        });

        it('refuses a wrong password, keeping the claimed attempt', async () => {
            authService.validateUser.mockResolvedValue(false);

            await expect(
                controller.disable(user, 's1', {
                    password: 'bad',
                    code: '123456',
                })
            ).rejects.toMatchObject({
                response: {
                    statusCode: ENUM_USER_STATUS_CODE_ERROR.PASSWORD_NOT_MATCH,
                },
            });
            expect(storedAttempts).toBe(1);
            expect(mfaService.disable).not.toHaveBeenCalled();
        });

        it('refuses a wrong code even with the right password', async () => {
            authService.validateUser.mockResolvedValue(true);
            mfaService.verify.mockResolvedValue(null);

            await expect(
                controller.disable(user, 's1', {
                    password: 'pass',
                    code: '000000',
                })
            ).rejects.toThrow('auth.error.mfaCodeInvalid');
            expect(storedAttempts).toBe(1);
            expect(mfaService.disable).not.toHaveBeenCalled();
            expect(mfaService.revokeSessionsAndNotify).not.toHaveBeenCalled();
        });

        it('refuses a locked account without checking the password', async () => {
            storedAttempts = 5;

            await expect(
                controller.disable(user, 's1', {
                    password: 'pass',
                    code: '123456',
                })
            ).rejects.toMatchObject({
                response: {
                    statusCode:
                        ENUM_USER_STATUS_CODE_ERROR.PASSWORD_ATTEMPT_MAX,
                },
            });
            expect(authService.validateUser).not.toHaveBeenCalled();
        });

        it('lets only one of two parallel guesses use the last attempt', async () => {
            storedAttempts = 4;
            authService.validateUser.mockResolvedValue(false);

            const results = await Promise.allSettled([
                controller.disable(user, 's1', { password: 'a', code: '1' }),
                controller.disable(user, 's1', { password: 'b', code: '2' }),
            ]);

            const codes = results.map(
                r => (r as PromiseRejectedResult).reason.response.statusCode
            );
            expect(codes.sort()).toEqual(
                [
                    ENUM_USER_STATUS_CODE_ERROR.PASSWORD_NOT_MATCH,
                    ENUM_USER_STATUS_CODE_ERROR.PASSWORD_ATTEMPT_MAX,
                ].sort()
            );
            expect(authService.validateUser).toHaveBeenCalledTimes(1);
        });

        it('refuses when MFA is not on', async () => {
            user.mfaEnabled = false;

            await expect(
                controller.disable(user, 's1', {
                    password: 'pass',
                    code: '123456',
                })
            ).rejects.toMatchObject({
                response: {
                    statusCode: ENUM_AUTH_STATUS_CODE_ERROR.MFA_NOT_ENABLED,
                },
            });
        });
    });

    describe('regenerateRecoveryCodes', () => {
        it('returns a new set with the right password and code', async () => {
            authService.validateUser.mockResolvedValue(true);
            mfaService.verify.mockResolvedValue('totp');
            mfaService.regenerateRecoveryCodes.mockResolvedValue({
                recoveryCodes: ['new'],
            });

            const result = await controller.regenerateRecoveryCodes(user, {
                password: 'pass',
                code: '123456',
            });

            expect(result.data).toEqual({ recoveryCodes: ['new'] });
            expect(mfaService.verify).toHaveBeenCalledWith(user, '123456');
        });

        it('refuses a wrong code', async () => {
            authService.validateUser.mockResolvedValue(true);
            mfaService.verify.mockResolvedValue(null);

            await expect(
                controller.regenerateRecoveryCodes(user, {
                    password: 'pass',
                    code: '000000',
                })
            ).rejects.toThrow('auth.error.mfaCodeInvalid');
            expect(mfaService.regenerateRecoveryCodes).not.toHaveBeenCalled();
        });

        it('refuses when MFA is not on', async () => {
            user.mfaEnabled = false;

            await expect(
                controller.regenerateRecoveryCodes(user, {
                    password: 'pass',
                    code: '123456',
                })
            ).rejects.toMatchObject({
                response: {
                    statusCode: ENUM_AUTH_STATUS_CODE_ERROR.MFA_NOT_ENABLED,
                },
            });
        });
    });
});
