import { ForbiddenException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { EntityManager } from '@mikro-orm/postgresql';
import { AuthPublicController } from '@app/modules/auth/controllers/auth.public.controller';
import { UserService } from '@app/modules/user/services/user.service';
import { AuthService } from '@app/modules/auth/services/auth.service';
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
import { ENUM_SEND_EMAIL_PROCESS } from '@app/modules/email/enums/email.enum';
import { ENUM_TURNSTILE_ACTION } from '@app/common/turnstile/enums/turnstile.action.enum';
import { ENUM_USER_STATUS_CODE_ERROR } from '@app/modules/user/enums/user.status-code.enum';

describe('AuthPublicController.signUp', () => {
    let controller: AuthPublicController;

    const enqueue = jest.fn();
    const findOneByName = jest.fn();
    const existByEmail = jest.fn();
    const findOneByIdCountry = jest.fn();
    const createPassword = jest.fn();
    const signUp = jest.fn();
    const createEmailByUser = jest.fn();
    const createByUserPasswordHistory = jest.fn();
    const createByUserActivity = jest.fn();
    const begin = jest.fn();
    const commit = jest.fn();
    const rollback = jest.fn();
    const fork = jest.fn(() => ({ begin, commit, rollback }));
    const verifyTurnstile = jest.fn();

    const user = { id: 'user-1' };
    const verification = {
        id: 'verification-1',
        otp: '123456',
        expiredDate: new Date('2026-01-01T00:00:00.000Z'),
        reference: 'ref-1',
    };

    beforeEach(async () => {
        enqueue.mockReset();
        findOneByName.mockReset();
        existByEmail.mockReset();
        findOneByIdCountry.mockReset();
        createPassword.mockReset();
        signUp.mockReset();
        createEmailByUser.mockReset();
        createByUserPasswordHistory.mockReset();
        createByUserActivity.mockReset();
        begin.mockReset();
        commit.mockReset();
        rollback.mockReset();
        fork.mockClear();
        verifyTurnstile.mockReset();

        const module: TestingModule = await Test.createTestingModule({
            controllers: [AuthPublicController],
            providers: [
                { provide: EntityManager, useValue: { fork } },
                { provide: CloudTasksQueueClient, useValue: { enqueue } },
                { provide: ConfigService, useValue: { get: jest.fn() } },
                { provide: ApiKeyService, useValue: {} },
                { provide: HelperDateService, useValue: {} },
                { provide: UserService, useValue: { existByEmail, signUp } },
                { provide: AuthService, useValue: { createPassword } },
                {
                    provide: CountryService,
                    useValue: { findOneById: findOneByIdCountry },
                },
                { provide: RoleService, useValue: { findOneByName } },
                {
                    provide: PasswordHistoryService,
                    useValue: { createByUser: createByUserPasswordHistory },
                },
                {
                    provide: VerificationService,
                    useValue: { createEmailByUser },
                },
                { provide: SessionService, useValue: {} },
                {
                    provide: ActivityService,
                    useValue: { createByUser: createByUserActivity },
                },
                { provide: MessageService, useValue: {} },
                {
                    provide: TurnstileService,
                    useValue: { verify: verifyTurnstile },
                },
            ],
        }).compile();

        controller = module.get(AuthPublicController);

        findOneByName.mockResolvedValue({ id: 'role-1' });
        existByEmail.mockResolvedValue(false);
        findOneByIdCountry.mockResolvedValue({ id: 'country-1' });
        createPassword.mockReturnValue({ password: 'hashed' });
        signUp.mockResolvedValue(user);
        createEmailByUser.mockResolvedValue(verification);
        createByUserPasswordHistory.mockResolvedValue(undefined);
        createByUserActivity.mockResolvedValue(undefined);
        commit.mockResolvedValue(undefined);
        verifyTurnstile.mockResolvedValue(undefined);
    });

    it('enqueues WELCOME via CloudTasksQueueClient after sign-up commits', async () => {
        await controller.signUp({
            email: 'new@user.com',
            name: 'New User',
            password: 'Passw0rd!',
            country: 'country-1',
        } as any);

        expect(enqueue).toHaveBeenCalledWith(
            'email',
            ENUM_SEND_EMAIL_PROCESS.WELCOME,
            { send: { email: 'new@user.com', name: 'New User' } },
            { taskName: 'WELCOME-user-1-verification-1' }
        );
    });

    it('enqueues VERIFICATION via CloudTasksQueueClient after sign-up commits', async () => {
        await controller.signUp({
            email: 'new@user.com',
            name: 'New User',
            password: 'Passw0rd!',
            country: 'country-1',
        } as any);

        expect(enqueue).toHaveBeenCalledWith(
            'email',
            ENUM_SEND_EMAIL_PROCESS.VERIFICATION,
            {
                send: { email: 'new@user.com', name: 'New User' },
                data: {
                    otp: '123456',
                    expiredAt: verification.expiredDate,
                    reference: 'ref-1',
                },
            },
            { taskName: 'VERIFICATION-user-1-verification-1' }
        );
    });

    it('verifies the Turnstile token before touching the user service', async () => {
        await controller.signUp({
            email: 'new@user.com',
            name: 'New User',
            password: 'Passw0rd!',
            country: 'country-1',
            turnstileToken: 'tok-123',
        } as any);

        expect(verifyTurnstile).toHaveBeenCalledWith(
            'tok-123',
            ENUM_TURNSTILE_ACTION.SIGN_UP
        );
        expect(verifyTurnstile.mock.invocationCallOrder[0]).toBeLessThan(
            existByEmail.mock.invocationCallOrder[0]
        );
    });

    it('rejects sign-up without creating a user when Turnstile fails', async () => {
        verifyTurnstile.mockRejectedValue(new ForbiddenException());

        await expect(
            controller.signUp({
                email: 'bot@user.com',
                name: 'Bot',
                password: 'Passw0rd!',
                country: 'country-1',
            } as any)
        ).rejects.toThrow(ForbiddenException);

        expect(existByEmail).not.toHaveBeenCalled();
        expect(signUp).not.toHaveBeenCalled();
    });
});

describe('AuthPublicController.loginWithCredential', () => {
    let controller: AuthPublicController;

    const findOneByEmail = jest.fn();
    const getPasswordAttempt = jest.fn();
    const getPasswordMaxAttempt = jest.fn();
    const validateUser = jest.fn();
    const verifyLoginTurnstile = jest.fn();
    const checkPasswordExpired = jest.fn();
    const resetPasswordAttempt = jest.fn();
    const join = jest.fn();
    const createToken = jest.fn();
    const setRefreshTokenCookie = jest.fn();
    const createSession = jest.fn();
    const setLoginSession = jest.fn();
    const createByUserActivity = jest.fn();
    const begin = jest.fn();
    const commit = jest.fn();
    const rollback = jest.fn();
    const fork = jest.fn(() => ({ begin, commit, rollback }));

    const activeUser = {
        id: 'user-3',
        status: 'ACTIVE',
        passwordAttempt: 0,
        passwordExpired: new Date('2099-01-01T00:00:00.000Z'),
        role: { isActive: true },
        verification: { email: true },
    };

    beforeEach(async () => {
        findOneByEmail.mockReset();
        verifyLoginTurnstile.mockReset();
        getPasswordAttempt.mockReset();
        getPasswordMaxAttempt.mockReset();
        validateUser.mockReset();
        checkPasswordExpired.mockReset();
        resetPasswordAttempt.mockReset();
        join.mockReset();
        createToken.mockReset();
        setRefreshTokenCookie.mockReset();
        createSession.mockReset();
        setLoginSession.mockReset();
        createByUserActivity.mockReset();
        begin.mockReset();
        commit.mockReset();
        rollback.mockReset();
        fork.mockClear();

        const module: TestingModule = await Test.createTestingModule({
            controllers: [AuthPublicController],
            providers: [
                { provide: EntityManager, useValue: { fork } },
                { provide: CloudTasksQueueClient, useValue: {} },
                { provide: ConfigService, useValue: { get: jest.fn() } },
                { provide: ApiKeyService, useValue: {} },
                { provide: HelperDateService, useValue: {} },
                {
                    provide: UserService,
                    useValue: {
                        findOneByEmail,
                        resetPasswordAttempt,
                        join,
                    },
                },
                {
                    provide: AuthService,
                    useValue: {
                        getPasswordAttempt,
                        getPasswordMaxAttempt,
                        validateUser,
                        checkPasswordExpired,
                        createToken,
                        setRefreshTokenCookie,
                    },
                },
                { provide: CountryService, useValue: {} },
                { provide: RoleService, useValue: {} },
                { provide: PasswordHistoryService, useValue: {} },
                { provide: VerificationService, useValue: {} },
                {
                    provide: SessionService,
                    useValue: {
                        create: createSession,
                        setLoginSession,
                    },
                },
                {
                    provide: ActivityService,
                    useValue: { createByUser: createByUserActivity },
                },
                { provide: MessageService, useValue: {} },
                {
                    provide: TurnstileService,
                    useValue: { verify: verifyLoginTurnstile },
                },
            ],
        }).compile();

        controller = module.get(AuthPublicController);

        getPasswordAttempt.mockReturnValue(false);
        getPasswordMaxAttempt.mockReturnValue(5);
        validateUser.mockReturnValue(true);
        verifyLoginTurnstile.mockResolvedValue(undefined);
        checkPasswordExpired.mockReturnValue(false);
        resetPasswordAttempt.mockResolvedValue(undefined);
        join.mockResolvedValue(activeUser);
        createSession.mockResolvedValue({ id: 'session-1' });
        setLoginSession.mockResolvedValue(undefined);
        createByUserActivity.mockResolvedValue(undefined);
        commit.mockResolvedValue(undefined);
        createToken.mockReturnValue({ accessToken: 'a', refreshToken: 'r' });
    });

    it('rejects a BLOCKED user with BLOCKED_FORBIDDEN (not the generic inactive code)', async () => {
        findOneByEmail.mockResolvedValue({
            id: 'user-1',
            status: 'BLOCKED',
            passwordAttempt: 0,
        });

        await expect(
            controller.loginWithCredential(
                { email: 'blocked@x.com', password: 'pass' } as any,
                {} as any,
                {} as any
            )
        ).rejects.toMatchObject({
            response: {
                statusCode: ENUM_USER_STATUS_CODE_ERROR.BLOCKED_FORBIDDEN,
                message: 'user.error.blocked',
            },
        });
    });

    it('rejects an INACTIVE user with the generic INACTIVE_FORBIDDEN code', async () => {
        findOneByEmail.mockResolvedValue({
            id: 'user-2',
            status: 'INACTIVE',
            passwordAttempt: 0,
        });

        await expect(
            controller.loginWithCredential(
                { email: 'inactive@x.com', password: 'pass' } as any,
                {} as any,
                {} as any
            )
        ).rejects.toMatchObject({
            response: {
                statusCode: ENUM_USER_STATUS_CODE_ERROR.INACTIVE_FORBIDDEN,
                message: 'user.error.inactive',
            },
        });
    });

    it('verifies the Turnstile token before looking the user up', async () => {
        findOneByEmail.mockResolvedValue({
            id: 'user-3',
            status: 'ACTIVE',
            passwordAttempt: 0,
        });

        await controller
            .loginWithCredential(
                {
                    email: 'ok@x.com',
                    password: 'pass',
                    turnstileToken: 'tok-123',
                } as any,
                {} as any,
                {} as any
            )
            .catch(() => undefined);

        expect(verifyLoginTurnstile).toHaveBeenCalledWith(
            'tok-123',
            ENUM_TURNSTILE_ACTION.LOGIN
        );
        expect(verifyLoginTurnstile.mock.invocationCallOrder[0]).toBeLessThan(
            findOneByEmail.mock.invocationCallOrder[0]
        );
    });

    it('rejects login without looking the user up when Turnstile fails', async () => {
        verifyLoginTurnstile.mockRejectedValue(new ForbiddenException());

        await expect(
            controller.loginWithCredential(
                { email: 'bot@x.com', password: 'pass' } as any,
                {} as any,
                {} as any
            )
        ).rejects.toThrow(ForbiddenException);

        expect(findOneByEmail).not.toHaveBeenCalled();
    });

    it('passes rememberMe=true through to createToken and the refresh cookie', async () => {
        findOneByEmail.mockResolvedValue(activeUser);

        await controller.loginWithCredential(
            { email: 'ok@x.com', password: 'pass', rememberMe: true } as any,
            {} as any,
            {} as any
        );

        expect(createToken).toHaveBeenCalledWith(activeUser, 'session-1', true);
        expect(setRefreshTokenCookie).toHaveBeenCalledWith({}, 'r', true);
    });

    it('passes rememberMe=false through to createToken and the refresh cookie', async () => {
        findOneByEmail.mockResolvedValue(activeUser);

        await controller.loginWithCredential(
            { email: 'ok@x.com', password: 'pass', rememberMe: false } as any,
            {} as any,
            {} as any
        );

        expect(createToken).toHaveBeenCalledWith(activeUser, 'session-1', false);
        expect(setRefreshTokenCookie).toHaveBeenCalledWith({}, 'r', false);
    });

    it('leaves rememberMe undefined through the chain when the field is omitted', async () => {
        findOneByEmail.mockResolvedValue(activeUser);

        await controller.loginWithCredential(
            { email: 'ok@x.com', password: 'pass' } as any,
            {} as any,
            {} as any
        );

        expect(createToken).toHaveBeenCalledWith(
            activeUser,
            'session-1',
            undefined
        );
    });
});
