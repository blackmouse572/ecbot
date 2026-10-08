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
import { ImpersonationService } from '@app/modules/auth/services/impersonation.service';
import { ENUM_SEND_EMAIL_PROCESS } from '@app/modules/email/enums/email.enum';
import { ENUM_TURNSTILE_ACTION } from '@app/common/turnstile/enums/turnstile.action.enum';
import { ENUM_USER_STATUS_CODE_ERROR } from '@app/modules/user/enums/user.status-code.enum';
import { ENUM_ACTIVITY_ACTION } from '@app/modules/activity/enums/activity.enum';
import { ENUM_POLICY_SUBJECT } from '@app/modules/policy/enums/policy.enum';

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
                { provide: ImpersonationService, useValue: {} },
            ],
        }).compile();

        controller = module.get(AuthPublicController);

        findOneByName.mockResolvedValue({ id: 'role-1' });
        existByEmail.mockResolvedValue(false);
        findOneByIdCountry.mockResolvedValue({ id: 'country-1' });
        createPassword.mockResolvedValue({ password: 'hashed' });
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

    // #141: the verification email is written in the sign-up's language.
    it('passes the request language on to the verification email', async () => {
        await controller.signUp(
            {
                email: 'new@user.com',
                name: 'New User',
                password: 'Passw0rd!',
                country: 'country-1',
            } as any,
            'vi'
        );

        expect(enqueue).toHaveBeenCalledWith(
            'email',
            ENUM_SEND_EMAIL_PROCESS.VERIFICATION,
            expect.objectContaining({
                data: expect.objectContaining({ language: 'vi' }),
            }),
            expect.anything()
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
    const runDummyPasswordCompare = jest.fn();
    const maybeRehashPassword = jest.fn();
    const verifyLoginTurnstile = jest.fn();
    const checkPasswordExpired = jest.fn();
    const resetPasswordAttempt = jest.fn();
    const increasePasswordAttempt = jest.fn();
    const rehashPassword = jest.fn();
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
        runDummyPasswordCompare.mockReset();
        maybeRehashPassword.mockReset();
        checkPasswordExpired.mockReset();
        resetPasswordAttempt.mockReset();
        increasePasswordAttempt.mockReset();
        rehashPassword.mockReset();
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
                        increasePasswordAttempt,
                        rehashPassword,
                        join,
                    },
                },
                {
                    provide: AuthService,
                    useValue: {
                        getPasswordAttempt,
                        getPasswordMaxAttempt,
                        validateUser,
                        runDummyPasswordCompare,
                        maybeRehashPassword,
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
                { provide: ImpersonationService, useValue: {} },
            ],
        }).compile();

        controller = module.get(AuthPublicController);

        getPasswordAttempt.mockReturnValue(false);
        getPasswordMaxAttempt.mockReturnValue(5);
        validateUser.mockResolvedValue(true);
        runDummyPasswordCompare.mockResolvedValue(undefined);
        maybeRehashPassword.mockResolvedValue(null);
        verifyLoginTurnstile.mockResolvedValue(undefined);
        checkPasswordExpired.mockReturnValue(false);
        resetPasswordAttempt.mockResolvedValue(undefined);
        increasePasswordAttempt.mockResolvedValue(undefined);
        rehashPassword.mockResolvedValue(undefined);
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

        expect(createToken).toHaveBeenCalledWith(
            activeUser,
            'session-1',
            false
        );
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

    it('rejects an unknown email with the same error as a wrong password, and runs a dummy bcrypt compare', async () => {
        findOneByEmail.mockResolvedValue(undefined);

        await expect(
            controller.loginWithCredential(
                { email: 'nobody@x.com', password: 'pass' } as any,
                {} as any,
                {} as any
            )
        ).rejects.toMatchObject({
            response: {
                statusCode: ENUM_USER_STATUS_CODE_ERROR.PASSWORD_NOT_MATCH,
                message: 'auth.error.invalidCredential',
            },
        });

        expect(runDummyPasswordCompare).toHaveBeenCalledWith('pass');
        expect(validateUser).not.toHaveBeenCalled();
    });

    it('rejects a wrong password with the same statusCode/message as an unknown email, and no attempt count', async () => {
        findOneByEmail.mockResolvedValue(activeUser);
        validateUser.mockResolvedValue(false);

        const error = await controller
            .loginWithCredential(
                { email: 'ok@x.com', password: 'wrong' } as any,
                {} as any,
                {} as any
            )
            .catch(err => err);

        expect(error.response).toStrictEqual({
            statusCode: ENUM_USER_STATUS_CODE_ERROR.PASSWORD_NOT_MATCH,
            message: 'auth.error.invalidCredential',
        });
        expect(error.response.data).toBeUndefined();
        expect(increasePasswordAttempt).toHaveBeenCalledWith(activeUser);
    });

    it('does not increase the attempt counter or reveal lockout once already at max, on a wrong password', async () => {
        findOneByEmail.mockResolvedValue({
            ...activeUser,
            passwordAttempt: 5,
        });
        getPasswordAttempt.mockReturnValue(true);
        getPasswordMaxAttempt.mockReturnValue(5);
        validateUser.mockResolvedValue(false);

        await expect(
            controller.loginWithCredential(
                { email: 'ok@x.com', password: 'wrong' } as any,
                {} as any,
                {} as any
            )
        ).rejects.toMatchObject({
            response: {
                statusCode: ENUM_USER_STATUS_CODE_ERROR.PASSWORD_NOT_MATCH,
                message: 'auth.error.invalidCredential',
            },
        });

        expect(increasePasswordAttempt).not.toHaveBeenCalled();
    });

    // Fix round 1: the original version of this test asserted the opposite
    // — that a locked account revealed PASSWORD_ATTEMPT_MAX once the
    // password matched. That was itself an oracle: a 403 for the right
    // password vs. a 400 for a wrong one lets an attacker binary-search the
    // password of an account they already know is locked, with no attempt
    // limit on the guessing (the counter is frozen once locked). A locked
    // account must now be indistinguishable regardless of password
    // correctness — same error, no tokens either way.
    it('never reveals the lockout or issues tokens once locked, even with the correct password', async () => {
        findOneByEmail.mockResolvedValue({
            ...activeUser,
            passwordAttempt: 5,
        });
        getPasswordAttempt.mockReturnValue(true);
        getPasswordMaxAttempt.mockReturnValue(5);
        validateUser.mockResolvedValue(true);

        await expect(
            controller.loginWithCredential(
                { email: 'ok@x.com', password: 'pass' } as any,
                {} as any,
                {} as any
            )
        ).rejects.toMatchObject({
            response: {
                statusCode: ENUM_USER_STATUS_CODE_ERROR.PASSWORD_NOT_MATCH,
                message: 'auth.error.invalidCredential',
            },
        });

        // Still ran the real compare, so a locked account's timing matches
        // an unlocked wrong-password rejection.
        expect(validateUser).toHaveBeenCalledWith('pass', undefined);
        expect(increasePasswordAttempt).not.toHaveBeenCalled();
        expect(createToken).not.toHaveBeenCalled();
    });

    it('rehashes a stored password hash that is weaker than the configured cost, after a successful login', async () => {
        findOneByEmail.mockResolvedValue(activeUser);
        maybeRehashPassword.mockResolvedValue({
            passwordHash: 'new-hash-at-cost-12',
            salt: 'new-salt',
        });

        await controller.loginWithCredential(
            { email: 'ok@x.com', password: 'pass' } as any,
            {} as any,
            {} as any
        );

        expect(maybeRehashPassword).toHaveBeenCalledWith(
            'pass',
            (activeUser as any).password
        );
        expect(rehashPassword).toHaveBeenCalledWith(activeUser, {
            passwordHash: 'new-hash-at-cost-12',
            salt: 'new-salt',
        });
    });

    it('does not rehash when the stored hash is already at the configured cost', async () => {
        findOneByEmail.mockResolvedValue(activeUser);
        maybeRehashPassword.mockResolvedValue(null);

        await controller.loginWithCredential(
            { email: 'ok@x.com', password: 'pass' } as any,
            {} as any,
            {} as any
        );

        expect(rehashPassword).not.toHaveBeenCalled();
    });

    describe('audit trail', () => {
        const login = (password = 'pass') =>
            controller
                .loginWithCredential(
                    { email: 'ok@x.com', password } as any,
                    {} as any,
                    {} as any
                )
                .catch(err => err);

        const failedWith = (user: any, reason: string) =>
            expect(createByUserActivity).toHaveBeenCalledWith(user, {
                action: ENUM_ACTIVITY_ACTION.LOGIN_FAILED,
                subject: ENUM_POLICY_SUBJECT.AUTH,
                metadata: { id: user.id, name: user.email, reason },
            });

        it('records a successful login as LOGIN', async () => {
            findOneByEmail.mockResolvedValue(activeUser);

            await login();

            expect(createByUserActivity).toHaveBeenCalledWith(
                activeUser,
                expect.objectContaining({
                    action: ENUM_ACTIVITY_ACTION.LOGIN,
                    subject: ENUM_POLICY_SUBJECT.AUTH,
                })
            );
        });

        it('records a wrong password as LOGIN_FAILED', async () => {
            findOneByEmail.mockResolvedValue(activeUser);
            validateUser.mockResolvedValue(false);

            await login('wrong');

            failedWith(activeUser, 'invalid_password');
        });

        it('records an attempt on a locked account as LOGIN_FAILED', async () => {
            const locked = { ...activeUser, passwordAttempt: 5 };
            findOneByEmail.mockResolvedValue(locked);
            getPasswordAttempt.mockReturnValue(true);

            await login();

            failedWith(locked, 'locked');
        });

        it('records a blocked or inactive account as LOGIN_FAILED', async () => {
            const blocked = { ...activeUser, status: 'BLOCKED' };
            findOneByEmail.mockResolvedValue(blocked);
            await login();
            failedWith(blocked, 'blocked');

            const inactive = { ...activeUser, status: 'INACTIVE' };
            findOneByEmail.mockResolvedValue(inactive);
            await login();
            failedWith(inactive, 'inactive');
        });

        it('records an unverified email as LOGIN_FAILED', async () => {
            findOneByEmail.mockResolvedValue(activeUser);
            join.mockResolvedValue({
                ...activeUser,
                verification: { email: false },
            });

            await login();

            failedWith(activeUser, 'email_not_verified');
        });

        it('records nothing for an unknown email', async () => {
            findOneByEmail.mockResolvedValue(undefined);

            await login();

            expect(createByUserActivity).not.toHaveBeenCalled();
        });

        it('returns the same error when the audit insert fails', async () => {
            findOneByEmail.mockResolvedValue(activeUser);
            validateUser.mockResolvedValue(false);
            createByUserActivity.mockRejectedValue(new Error('db down'));

            const error = await login('wrong');

            expect(error.response).toStrictEqual({
                statusCode: ENUM_USER_STATUS_CODE_ERROR.PASSWORD_NOT_MATCH,
                message: 'auth.error.invalidCredential',
            });
        });
    });
});
