import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { EntityManager } from '@mikro-orm/postgresql';
import { AuthPublicController } from '@app/modules/auth/controllers/auth.public.controller';
import { UserService } from '@app/modules/user/services/user.service';
import { AuthService } from '@app/modules/auth/services/auth.service';
import { MfaService } from '@app/modules/auth/services/mfa.service';
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
        increasePasswordAttempt: jest.fn(),
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
    const mfaService = {
        createChallenge: jest.fn(),
        findChallenge: jest.fn(),
        deleteChallenge: jest.fn(),
        verify: jest.fn(),
        invalidCodeError: jest.fn(
            () => new Error('auth.error.mfaCodeInvalid') as any
        ),
    };
    const sessionService = { create: jest.fn(), setLoginSession: jest.fn() };
    const activityService = { createByUser: jest.fn() };
    const fork = jest.fn(() => ({
        begin: jest.fn(),
        commit: jest.fn(),
        rollback: jest.fn(),
    }));

    let mfaUser: any;

    beforeEach(async () => {
        jest.clearAllMocks();
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
        mfaService.findChallenge.mockResolvedValue({
            user: 'user-mfa',
            rememberMe: true,
        });
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

            expect(userService.resetPasswordAttempt).not.toHaveBeenCalled();
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

    describe('loginWithMfa', () => {
        it('issues tokens, the refresh cookie and a session for a valid code', async () => {
            mfaService.verify.mockResolvedValue(true);
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
            expect(mfaService.deleteChallenge).toHaveBeenCalledWith(
                'challenge-token'
            );
            expect(userService.resetPasswordAttempt).toHaveBeenCalledWith(
                mfaUser
            );
        });

        it('rejects an unknown or expired challenge', async () => {
            mfaService.findChallenge.mockResolvedValue(null);

            await expect(
                controller.loginWithMfa(
                    { mfaToken: 'nope', code: '123456' },
                    {} as any,
                    {} as any
                )
            ).rejects.toMatchObject({
                response: {
                    statusCode:
                        ENUM_AUTH_STATUS_CODE_ERROR.MFA_CHALLENGE_INVALID,
                },
            });
            expect(mfaService.verify).not.toHaveBeenCalled();
        });

        it('counts a wrong code toward the lockout and issues nothing', async () => {
            mfaService.verify.mockResolvedValue(false);

            await expect(
                controller.loginWithMfa(
                    { mfaToken: 'challenge-token', code: '000000' },
                    {} as any,
                    {} as any
                )
            ).rejects.toThrow('auth.error.mfaCodeInvalid');

            expect(userService.increasePasswordAttempt).toHaveBeenCalledWith(
                mfaUser
            );
            expect(authService.createToken).not.toHaveBeenCalled();
            expect(mfaService.deleteChallenge).not.toHaveBeenCalled();
        });

        it('refuses a locked account and burns the challenge, without checking the code', async () => {
            mfaUser.passwordAttempt = 5;

            await expect(
                controller.loginWithMfa(
                    { mfaToken: 'challenge-token', code: '123456' },
                    {} as any,
                    {} as any
                )
            ).rejects.toMatchObject({
                response: {
                    statusCode:
                        ENUM_USER_STATUS_CODE_ERROR.PASSWORD_ATTEMPT_MAX,
                },
            });
            expect(mfaService.verify).not.toHaveBeenCalled();
            expect(mfaService.deleteChallenge).toHaveBeenCalledWith(
                'challenge-token'
            );
            expect(authService.createToken).not.toHaveBeenCalled();
        });
    });
});
