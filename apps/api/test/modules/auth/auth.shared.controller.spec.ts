import { Test, TestingModule } from '@nestjs/testing';
import { EntityManager } from '@mikro-orm/postgresql';
import { AuthSharedController } from '@app/modules/auth/controllers/auth.shared.controller';
import { UserService } from '@app/modules/user/services/user.service';
import { AuthService } from '@app/modules/auth/services/auth.service';
import { PasswordHistoryService } from '@app/modules/password-history/services/password-history.service';
import { SessionService } from '@app/modules/session/services/session.service';
import { ActivityService } from '@app/modules/activity/services/activity.service';
import { MessageService } from '@app/common/message/services/message.service';
import { CloudTasksQueueClient } from '@app/worker/cloud-tasks-queue.client';
import { ENUM_SEND_EMAIL_PROCESS } from '@app/modules/email/enums/email.enum';
import { ENUM_USER_STATUS_CODE_ERROR } from '@app/modules/user/enums/user.status-code.enum';

describe('AuthSharedController.changePassword', () => {
    let controller: AuthSharedController;

    const enqueue = jest.fn();
    const findOneById = jest.fn();
    const increasePasswordAttempt = jest.fn();
    const resetPasswordAttempt = jest.fn();
    const updatePassword = jest.fn();
    const getPasswordAttempt = jest.fn();
    const getPasswordMaxAttempt = jest.fn();
    const validateUser = jest.fn();
    const createPassword = jest.fn();
    const findOneUsedByUser = jest.fn();
    const createByUserPasswordHistory = jest.fn();
    const updateManyRevokeByUser = jest.fn();
    const createByUserActivity = jest.fn();
    const begin = jest.fn();
    const commit = jest.fn();
    const rollback = jest.fn();
    const fork = jest.fn(() => ({ begin, commit, rollback }));

    beforeEach(async () => {
        enqueue.mockReset();
        findOneById.mockReset();
        increasePasswordAttempt.mockReset();
        resetPasswordAttempt.mockReset();
        updatePassword.mockReset();
        getPasswordAttempt.mockReset();
        getPasswordMaxAttempt.mockReset();
        validateUser.mockReset();
        createPassword.mockReset();
        findOneUsedByUser.mockReset();
        createByUserPasswordHistory.mockReset();
        updateManyRevokeByUser.mockReset();
        createByUserActivity.mockReset();
        begin.mockReset();
        commit.mockReset();
        rollback.mockReset();
        fork.mockClear();

        const module: TestingModule = await Test.createTestingModule({
            controllers: [AuthSharedController],
            providers: [
                { provide: EntityManager, useValue: { fork } },
                { provide: CloudTasksQueueClient, useValue: { enqueue } },
                {
                    provide: UserService,
                    useValue: {
                        findOneById,
                        increasePasswordAttempt,
                        resetPasswordAttempt,
                        updatePassword,
                    },
                },
                {
                    provide: AuthService,
                    useValue: {
                        getPasswordAttempt,
                        getPasswordMaxAttempt,
                        validateUser,
                        createPassword,
                    },
                },
                {
                    provide: PasswordHistoryService,
                    useValue: {
                        findOneUsedByUser,
                        createByUser: createByUserPasswordHistory,
                    },
                },
                {
                    provide: SessionService,
                    useValue: { updateManyRevokeByUser },
                },
                {
                    provide: ActivityService,
                    useValue: { createByUser: createByUserActivity },
                },
                { provide: MessageService, useValue: {} },
            ],
        }).compile();

        controller = module.get(AuthSharedController);
        enqueue.mockResolvedValue(undefined);
    });

    it('enqueues CHANGE_PASSWORD via CloudTasksQueueClient after the password-change transaction commits', async () => {
        const user = {
            id: 'user-1',
            email: 'a@b.com',
            name: 'A',
            password: 'old-hash',
            passwordAttempt: 0,
        };
        findOneById.mockResolvedValue(user);
        getPasswordAttempt.mockReturnValue(true);
        getPasswordMaxAttempt.mockReturnValue(5);
        validateUser.mockResolvedValue(true);
        resetPasswordAttempt.mockResolvedValue(user);
        createPassword.mockResolvedValue({ password: 'new-hash' });
        findOneUsedByUser.mockResolvedValue(null);
        updatePassword.mockResolvedValue(user);
        createByUserPasswordHistory.mockResolvedValue(undefined);
        createByUserActivity.mockResolvedValue(undefined);
        updateManyRevokeByUser.mockResolvedValue(undefined);
        commit.mockResolvedValue(undefined);

        await controller.changePassword(
            { oldPassword: 'old', newPassword: 'new' } as any,
            'user-1'
        );

        expect(enqueue).toHaveBeenCalledWith(
            'email',
            ENUM_SEND_EMAIL_PROCESS.CHANGE_PASSWORD,
            { send: { email: 'a@b.com', name: 'A' } },
            {
                taskName: expect.stringMatching(
                    /^CHANGE_PASSWORD-user-1-CP\d+$/
                ),
            }
        );
    });

    it('does not roll back the already-committed session when enqueue fails', async () => {
        const user = {
            id: 'user-1',
            email: 'a@b.com',
            name: 'A',
            password: 'old-hash',
            passwordAttempt: 0,
        };
        findOneById.mockResolvedValue(user);
        getPasswordAttempt.mockReturnValue(true);
        getPasswordMaxAttempt.mockReturnValue(5);
        validateUser.mockResolvedValue(true);
        resetPasswordAttempt.mockResolvedValue(user);
        createPassword.mockResolvedValue({ password: 'new-hash' });
        findOneUsedByUser.mockResolvedValue(null);
        updatePassword.mockResolvedValue(user);
        createByUserPasswordHistory.mockResolvedValue(undefined);
        createByUserActivity.mockResolvedValue(undefined);
        updateManyRevokeByUser.mockResolvedValue(undefined);
        commit.mockResolvedValue(undefined);
        enqueue.mockRejectedValue(new Error('boom'));

        await expect(
            controller.changePassword(
                { oldPassword: 'old', newPassword: 'new' } as any,
                'user-1'
            )
        ).resolves.toBeUndefined();

        expect(commit).toHaveBeenCalledTimes(1);
        expect(rollback).not.toHaveBeenCalled();
    });
});

describe('AuthSharedController.refresh', () => {
    let controller: AuthSharedController;

    const findOneById = jest.fn();
    const findLoginSession = jest.fn();
    const refreshTokenFn = jest.fn();
    const setRefreshTokenCookie = jest.fn();
    const res = {} as any;

    const payload = {
        user: 'user-1',
        session: 'session-1',
        rememberMe: true,
    };

    beforeEach(async () => {
        findOneById.mockReset();
        findLoginSession.mockReset();
        refreshTokenFn.mockReset();
        setRefreshTokenCookie.mockReset();

        const module: TestingModule = await Test.createTestingModule({
            controllers: [AuthSharedController],
            providers: [
                { provide: EntityManager, useValue: {} },
                { provide: CloudTasksQueueClient, useValue: {} },
                { provide: UserService, useValue: { findOneById } },
                {
                    provide: AuthService,
                    useValue: {
                        refreshToken: refreshTokenFn,
                        setRefreshTokenCookie,
                    },
                },
                { provide: PasswordHistoryService, useValue: {} },
                { provide: SessionService, useValue: { findLoginSession } },
                { provide: ActivityService, useValue: {} },
                { provide: MessageService, useValue: {} },
            ],
        }).compile();

        controller = module.get(AuthSharedController);
        findLoginSession.mockResolvedValue({ id: 'session-1' });
    });

    it('rejects a BLOCKED user with BLOCKED_FORBIDDEN instead of crashing', async () => {
        findOneById.mockResolvedValue({ id: 'user-1', status: 'BLOCKED' });

        await expect(
            controller.refresh('refresh-token', payload as any, res)
        ).rejects.toMatchObject({
            response: {
                statusCode: ENUM_USER_STATUS_CODE_ERROR.BLOCKED_FORBIDDEN,
                message: 'user.error.blocked',
            },
        });
        expect(refreshTokenFn).not.toHaveBeenCalled();
    });

    it('rejects an INACTIVE user with the generic INACTIVE_FORBIDDEN code', async () => {
        findOneById.mockResolvedValue({ id: 'user-2', status: 'INACTIVE' });

        await expect(
            controller.refresh('refresh-token', payload as any, res)
        ).rejects.toMatchObject({
            response: {
                statusCode: ENUM_USER_STATUS_CODE_ERROR.INACTIVE_FORBIDDEN,
                message: 'user.error.inactive',
            },
        });
        expect(refreshTokenFn).not.toHaveBeenCalled();
    });

    it('issues a new access token for an ACTIVE user', async () => {
        const user = { id: 'user-3', status: 'ACTIVE' };
        findOneById.mockResolvedValue(user);
        refreshTokenFn.mockReturnValue({
            accessToken: 'new-token',
            refreshToken: 'refresh-token',
        });

        await expect(
            controller.refresh('refresh-token', payload as any, res)
        ).resolves.toEqual({
            data: { accessToken: 'new-token', refreshToken: 'refresh-token' },
        });
        expect(refreshTokenFn).toHaveBeenCalledWith(user, 'refresh-token');
    });

    it('re-sets the refresh cookie with the rememberMe carried in the decoded payload', async () => {
        findOneById.mockResolvedValue({ id: 'user-3', status: 'ACTIVE' });
        refreshTokenFn.mockReturnValue({
            accessToken: 'new-token',
            refreshToken: 'refresh-token',
        });

        await controller.refresh(
            'refresh-token',
            { ...payload, rememberMe: true } as any,
            res
        );

        expect(setRefreshTokenCookie).toHaveBeenCalledWith(
            res,
            'refresh-token',
            true
        );
    });

    it('re-sets the refresh cookie as session-only when the payload was not remembered', async () => {
        findOneById.mockResolvedValue({ id: 'user-3', status: 'ACTIVE' });
        refreshTokenFn.mockReturnValue({
            accessToken: 'new-token',
            refreshToken: 'refresh-token',
        });

        await controller.refresh(
            'refresh-token',
            { ...payload, rememberMe: false } as any,
            res
        );

        expect(setRefreshTokenCookie).toHaveBeenCalledWith(
            res,
            'refresh-token',
            false
        );
    });
});

describe('AuthSharedController.logout', () => {
    let controller: AuthSharedController;

    const verifyRefreshTokenAllowExpired = jest.fn();
    const clearRefreshTokenCookie = jest.fn();
    const findOneById = jest.fn();
    const updateRevoke = jest.fn();
    const res = {} as any;

    beforeEach(async () => {
        verifyRefreshTokenAllowExpired.mockReset();
        clearRefreshTokenCookie.mockReset();
        findOneById.mockReset();
        updateRevoke.mockReset();

        const module: TestingModule = await Test.createTestingModule({
            controllers: [AuthSharedController],
            providers: [
                { provide: EntityManager, useValue: {} },
                { provide: CloudTasksQueueClient, useValue: {} },
                { provide: UserService, useValue: {} },
                {
                    provide: AuthService,
                    useValue: {
                        verifyRefreshTokenAllowExpired,
                        clearRefreshTokenCookie,
                    },
                },
                { provide: PasswordHistoryService, useValue: {} },
                {
                    provide: SessionService,
                    useValue: { findOneById, updateRevoke },
                },
                { provide: ActivityService, useValue: {} },
                { provide: MessageService, useValue: {} },
            ],
        }).compile();

        controller = module.get(AuthSharedController);
    });

    it('revokes the session tied to a valid refresh cookie and clears the cookie', async () => {
        const req = { cookies: { refreshToken: 'valid-refresh-token' } } as any;
        verifyRefreshTokenAllowExpired.mockReturnValue({
            user: 'user-1',
            session: 'session-1',
        });
        const session = { id: 'session-1' };
        findOneById.mockResolvedValue(session);
        updateRevoke.mockResolvedValue(session);

        await controller.logout(req, res);

        expect(verifyRefreshTokenAllowExpired).toHaveBeenCalledWith(
            'valid-refresh-token'
        );
        expect(findOneById).toHaveBeenCalledWith('session-1');
        expect(updateRevoke).toHaveBeenCalledWith(session);
        expect(clearRefreshTokenCookie).toHaveBeenCalledWith(res);
    });

    it('is idempotent: clears the cookie and resolves when no refresh cookie is present', async () => {
        const req = { cookies: {} } as any;

        await expect(controller.logout(req, res)).resolves.toBeUndefined();

        expect(verifyRefreshTokenAllowExpired).not.toHaveBeenCalled();
        expect(updateRevoke).not.toHaveBeenCalled();
        expect(clearRefreshTokenCookie).toHaveBeenCalledWith(res);
    });

    it('is idempotent: clears the cookie and resolves when the refresh token fails verification (expired/forged/malformed)', async () => {
        const req = { cookies: { refreshToken: 'garbage' } } as any;
        verifyRefreshTokenAllowExpired.mockReturnValue(null);

        await expect(controller.logout(req, res)).resolves.toBeUndefined();

        expect(findOneById).not.toHaveBeenCalled();
        expect(updateRevoke).not.toHaveBeenCalled();
        expect(clearRefreshTokenCookie).toHaveBeenCalledWith(res);
    });

    it('is idempotent: clears the cookie and resolves even if the session lookup throws', async () => {
        const req = { cookies: { refreshToken: 'valid-refresh-token' } } as any;
        verifyRefreshTokenAllowExpired.mockReturnValue({
            user: 'user-1',
            session: 'session-1',
        });
        findOneById.mockRejectedValue(new Error('db down'));

        await expect(controller.logout(req, res)).resolves.toBeUndefined();

        expect(clearRefreshTokenCookie).toHaveBeenCalledWith(res);
    });

    it('does not revoke when the session no longer exists', async () => {
        const req = { cookies: { refreshToken: 'valid-refresh-token' } } as any;
        verifyRefreshTokenAllowExpired.mockReturnValue({
            user: 'user-1',
            session: 'session-1',
        });
        findOneById.mockResolvedValue(null);

        await controller.logout(req, res);

        expect(updateRevoke).not.toHaveBeenCalled();
        expect(clearRefreshTokenCookie).toHaveBeenCalledWith(res);
    });
});
