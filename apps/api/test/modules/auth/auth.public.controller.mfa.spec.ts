import { ENUM_ACTIVITY_ACTION } from '@app/modules/activity/enums/activity.enum';
import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { EntityManager } from '@mikro-orm/postgresql';
import { AuthPublicController } from '@app/modules/auth/controllers/auth.public.controller';
import { UserService } from '@app/modules/user/services/user.service';
import { AuthService } from '@app/modules/auth/services/auth.service';
import { MfaService } from '@app/modules/auth/services/mfa.service';
import { AuthLoginSessionService } from '@app/modules/auth/services/auth-login-session.service';
import { CountryService } from '@app/modules/country/services/country.service';
import { RoleService } from '@app/modules/role/services/role.service';
import { PasswordHistoryService } from '@app/modules/password-history/services/password-history.service';
import { VerificationService } from '@app/modules/verification/services/verification.service';
import { SessionService } from '@app/modules/session/services/session.service';
import { ActivityService } from '@app/modules/activity/services/activity.service';
import { MessageService } from '@app/common/message/services/message.service';
import { TurnstileService } from '@app/common/turnstile/services/turnstile.service';
import { ApiKeyService } from '@app/modules/api-key/services/api-key.service';
import { HelperDateService } from '@app/common/helper/services/helper.date.service';
import { CloudTasksQueueClient } from '@app/worker/cloud-tasks-queue.client';
import { ImpersonationService } from '@app/modules/auth/services/impersonation.service';
import { ENUM_AUTH_STATUS_CODE_ERROR } from '@app/modules/auth/enums/auth.status-code.enum';
import { ENUM_USER_STATUS_CODE_ERROR } from '@app/modules/user/enums/user.status-code.enum';

describe('AuthPublicController MFA login', () => {
    let controller: AuthPublicController;

    const userService = {
        findOneByEmail: jest.fn(),
        findOneById: jest.fn(),
        resetPasswordAttempt: jest.fn(),
        // Models the conditional UPDATE on the stored counter.
        claimPasswordAttempt: jest.fn(async (_user: any, max: number) => {
            if (storedAttempts >= max) return false;
            storedAttempts++;
            return true;
        }),
        clearPasswordAttempt: jest.fn(async () => {
            storedAttempts = 0;
        }),
        rehashPassword: jest.fn(),
        join: jest.fn(),
    };
    const authService = {
        getPasswordAttempt: jest.fn(),
        getPasswordMaxAttempt: jest.fn(),
        validateUser: jest.fn(),
        runDummyPasswordCompare: jest.fn(),
        maybeRehashPassword: jest.fn(),
        checkPasswordExpired: jest.fn(),
        createToken: jest.fn(),
        setRefreshTokenCookie: jest.fn(),
    };
    // One challenge in a store whose consume hands it out once, like GETDEL.
    let storedChallenge: any;
    const mfaService = {
        createChallenge: jest.fn(),
        findChallenge: jest.fn(async () => storedChallenge),
        consumeChallenge: jest.fn(async () => {
            const value = storedChallenge;
            storedChallenge = null;
            return value;
        }),
        verify: jest.fn(),
        invalidCodeError: jest.fn(
            () => new Error('auth.error.mfaCodeInvalid') as any
        ),
    };
    const sessionService = { create: jest.fn(), setLoginSession: jest.fn() };
    const activityService = {
        createByUser: jest.fn().mockResolvedValue(undefined),
    };
    const fork = jest.fn(() => ({
        begin: jest.fn(),
        commit: jest.fn(),
        rollback: jest.fn(),
    }));

    let mfaUser: any;
    let storedAttempts: number;

    beforeEach(async () => {
        jest.clearAllMocks();
        storedAttempts = 0;
        storedChallenge = { user: 'user-mfa', rememberMe: true };
        mfaUser = {
            id: 'user-mfa',
            status: 'ACTIVE',
            passwordAttempt: 0,
            passwordExpired: new Date('2099-01-01T00:00:00.000Z'),
            role: { isActive: true },
            verification: { email: true },
            mfaEnabled: true,
        };

        const module: TestingModule = await Test.createTestingModule({
            controllers: [AuthPublicController],
            providers: [
                { provide: EntityManager, useValue: { fork } },
                { provide: CloudTasksQueueClient, useValue: {} },
                { provide: ConfigService, useValue: { get: jest.fn() } },
                { provide: ApiKeyService, useValue: {} },
                { provide: HelperDateService, useValue: {} },
                { provide: UserService, useValue: userService },
                { provide: AuthService, useValue: authService },
                { provide: MfaService, useValue: mfaService },
                AuthLoginSessionService,
                { provide: CountryService, useValue: {} },
                { provide: RoleService, useValue: {} },
                { provide: PasswordHistoryService, useValue: {} },
                { provide: VerificationService, useValue: {} },
                { provide: SessionService, useValue: sessionService },
                { provide: ActivityService, useValue: activityService },
                { provide: MessageService, useValue: {} },
                {
                    provide: TurnstileService,
                    useValue: { verify: jest.fn() },
                },
                { provide: ImpersonationService, useValue: {} },
            ],
        }).compile();

        controller = module.get(AuthPublicController);

        authService.getPasswordAttempt.mockReturnValue(true);
        authService.getPasswordMaxAttempt.mockReturnValue(5);
        authService.validateUser.mockResolvedValue(true);
        authService.maybeRehashPassword.mockResolvedValue(null);
        authService.checkPasswordExpired.mockReturnValue(false);
        authService.createToken.mockReturnValue({
            accessToken: 'a',
            refreshToken: 'r',
        });
        userService.findOneByEmail.mockResolvedValue(mfaUser);
        userService.findOneById.mockResolvedValue(mfaUser);
        userService.join.mockImplementation(async (u: any) => u);
        sessionService.create.mockResolvedValue({ id: 'session-1' });
        mfaService.createChallenge.mockResolvedValue('challenge-token');
    });

    describe('password login with MFA on', () => {
        it('returns a challenge instead of tokens and opens no session', async () => {
            const result = await controller.loginWithCredential(
                { email: 'a@b.com', password: 'pass', rememberMe: true },
                {} as any,
                {} as any
            );

            expect(result.data).toEqual({
                mfaRequired: true,
                mfaToken: 'challenge-token',
                expiresIn: 300,
            });
            expect(mfaService.createChallenge).toHaveBeenCalledWith({
                user: 'user-mfa',
                rememberMe: true,
            });
            expect(authService.createToken).not.toHaveBeenCalled();
            expect(authService.setRefreshTokenCookie).not.toHaveBeenCalled();
            expect(sessionService.create).not.toHaveBeenCalled();
        });

        it('keeps the failed-attempt count until the second factor passes', async () => {
            await controller.loginWithCredential(
                { email: 'a@b.com', password: 'pass' },
                {} as any,
                {} as any
            );

            expect(userService.clearPasswordAttempt).not.toHaveBeenCalled();
        });

        it('still issues tokens directly when MFA is off', async () => {
            mfaUser.mfaEnabled = false;

            const result = await controller.loginWithCredential(
                { email: 'a@b.com', password: 'pass' },
                {} as any,
                {} as any
            );

            expect(result.data).toEqual({
                accessToken: 'a',
                refreshToken: 'r',
            });
            expect(mfaService.createChallenge).not.toHaveBeenCalled();
        });
    });

    describe.each([
        ['Google', 'loginWithGoogle'],
        ['Apple', 'loginWithApple'],
    ] as const)('%s login with MFA on', (_label, method) => {
        it('returns a challenge instead of tokens and opens no session', async () => {
            const result = await controller[method]('a@b.com', {} as any);

            expect(result.data).toEqual({
                mfaRequired: true,
                mfaToken: 'challenge-token',
                expiresIn: 300,
            });
            expect(mfaService.createChallenge).toHaveBeenCalledWith({
                user: 'user-mfa',
                rememberMe: undefined,
            });
            expect(sessionService.create).not.toHaveBeenCalled();
            expect(authService.createToken).not.toHaveBeenCalled();
            expect(userService.resetPasswordAttempt).not.toHaveBeenCalled();
        });

        it('still issues tokens directly when MFA is off', async () => {
            mfaUser.mfaEnabled = false;

            const result = await controller[method]('a@b.com', {} as any);

            expect(result.data).toEqual({
                accessToken: 'a',
                refreshToken: 'r',
            });
            expect(mfaService.createChallenge).not.toHaveBeenCalled();
        });
    });

    describe('loginWithMfa', () => {
        const mfaLogin = (code = '123456') =>
            controller.loginWithMfa(
                { mfaToken: 'challenge-token', code },
                {} as any,
                {} as any
            );

        it('issues tokens, the refresh cookie and a session for a valid code', async () => {
            mfaService.verify.mockResolvedValue('totp');
            storedAttempts = 2;
            const res = {} as any;

            const result = await controller.loginWithMfa(
                { mfaToken: 'challenge-token', code: '123456' },
                {} as any,
                res
            );

            expect(mfaService.verify).toHaveBeenCalledWith(mfaUser, '123456');
            expect(result.data).toEqual({
                accessToken: 'a',
                refreshToken: 'r',
            });
            expect(authService.createToken).toHaveBeenCalledWith(
                mfaUser,
                'session-1',
                true
            );
            expect(authService.setRefreshTokenCookie).toHaveBeenCalledWith(
                res,
                'r',
                true
            );
            expect(mfaService.consumeChallenge).toHaveBeenCalledWith(
                'challenge-token'
            );
            expect(storedAttempts).toBe(0);
        });

        it.each(['totp', 'recovery'])(
            'records the %s method on the LOGIN activity, without the email',
            async method => {
                mfaService.verify.mockResolvedValue(method);

                await mfaLogin();

                expect(activityService.createByUser).toHaveBeenCalledWith(
                    mfaUser,
                    expect.objectContaining({
                        action: ENUM_ACTIVITY_ACTION.LOGIN,
                        metadata: { id: 'user-mfa', method },
                    })
                );
            }
        );

        it('rejects an unknown or expired challenge', async () => {
            storedChallenge = null;

            await expect(mfaLogin()).rejects.toMatchObject({
                response: {
                    statusCode:
                        ENUM_AUTH_STATUS_CODE_ERROR.MFA_CHALLENGE_INVALID,
                },
            });
            expect(mfaService.verify).not.toHaveBeenCalled();
        });

        it('counts a wrong code toward the lockout, keeps the challenge and issues nothing', async () => {
            mfaService.verify.mockResolvedValue(null);

            await expect(mfaLogin('000000')).rejects.toThrow(
                'auth.error.mfaCodeInvalid'
            );

            expect(storedAttempts).toBe(1);
            expect(authService.createToken).not.toHaveBeenCalled();
            expect(mfaService.consumeChallenge).not.toHaveBeenCalled();
        });

        it('refuses a locked account and burns the challenge, without checking the code', async () => {
            storedAttempts = 5;

            await expect(mfaLogin()).rejects.toMatchObject({
                response: {
                    statusCode:
                        ENUM_USER_STATUS_CODE_ERROR.PASSWORD_ATTEMPT_MAX,
                },
            });
            expect(mfaService.verify).not.toHaveBeenCalled();
            expect(mfaService.consumeChallenge).toHaveBeenCalledWith(
                'challenge-token'
            );
            expect(authService.createToken).not.toHaveBeenCalled();
        });

        it('lets only one of two parallel guesses use the last attempt', async () => {
            storedAttempts = 4;
            mfaService.verify.mockResolvedValue(null);

            const results = await Promise.allSettled([
                mfaLogin('000001'),
                mfaLogin('000002'),
            ]);

            expect(results.every(r => r.status === 'rejected')).toBe(true);
            expect(mfaService.verify).toHaveBeenCalledTimes(1);
        });

        it('opens one session when two valid codes race on the same challenge', async () => {
            mfaService.verify.mockResolvedValue('totp');

            const results = await Promise.allSettled([
                mfaLogin('111111'),
                mfaLogin('222222'),
            ]);

            expect(results.filter(r => r.status === 'fulfilled')).toHaveLength(
                1
            );
            const rejected = results.find(
                r => r.status === 'rejected'
            ) as PromiseRejectedResult;
            expect(rejected.reason.response.statusCode).toBe(
                ENUM_AUTH_STATUS_CODE_ERROR.MFA_CHALLENGE_INVALID
            );
            expect(sessionService.create).toHaveBeenCalledTimes(1);
        });

        it('re-checks password expiry after the code passes', async () => {
            mfaService.verify.mockResolvedValue('totp');
            authService.checkPasswordExpired.mockReturnValue(true);

            await expect(mfaLogin()).rejects.toMatchObject({
                response: {
                    statusCode: ENUM_USER_STATUS_CODE_ERROR.PASSWORD_EXPIRED,
                },
            });
            expect(authService.createToken).not.toHaveBeenCalled();
        });
    });
});
