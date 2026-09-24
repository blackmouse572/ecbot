import { Test, TestingModule } from '@nestjs/testing';
import { EntityManager } from '@mikro-orm/postgresql';
import { ResetPasswordPublicController } from '@app/modules/reset-password/controllers/reset-password.public.controller';
import { UserService } from '@app/modules/user/services/user.service';
import { PasswordHistoryService } from '@app/modules/password-history/services/password-history.service';
import { AuthService } from '@app/modules/auth/services/auth.service';
import { ResetPasswordService } from '@app/modules/reset-password/services/reset-password.service';
import { SessionService } from '@app/modules/session/services/session.service';
import { CloudTasksQueueClient } from '@app/worker/cloud-tasks-queue.client';
import { ENUM_SEND_EMAIL_PROCESS } from '@app/modules/email/enums/email.enum';
import { ENUM_RESET_PASSWORD_STATUS_CODE_ERROR } from '@app/modules/reset-password/enums/reset-password.status-code.enum';

describe('ResetPasswordPublicController — email dispatch', () => {
    let controller: ResetPasswordPublicController;

    const enqueue = jest.fn();
    const findOneActiveByEmail = jest.fn();
    const findOneById = jest.fn();
    const checkActiveLatestEmailByUser = jest.fn();
    const inactiveEmailManyByUser = jest.fn();
    const requestEmailByUser = jest.fn();
    const checkOtp = jest.fn();
    const incrementOtpAttempt = jest.fn();
    const verifyOtp = jest.fn();
    const createPassword = jest.fn();
    const updatePassword = jest.fn();
    const resetEntity = jest.fn();
    const createByUser = jest.fn();
    const updateManyRevokeByUser = jest.fn();
    const begin = jest.fn();
    const commit = jest.fn();
    const rollback = jest.fn();
    // A single shared session object so `{ em: session }` assertions can
    // compare by reference instead of reconstructing the mock's shape.
    const session = { begin, commit, rollback };
    const fork = jest.fn(() => session);

    beforeEach(async () => {
        enqueue.mockReset();
        findOneActiveByEmail.mockReset();
        findOneById.mockReset();
        checkActiveLatestEmailByUser.mockReset();
        inactiveEmailManyByUser.mockReset();
        requestEmailByUser.mockReset();
        checkOtp.mockReset();
        incrementOtpAttempt.mockReset();
        verifyOtp.mockReset();
        createPassword.mockReset();
        updatePassword.mockReset();
        resetEntity.mockReset();
        createByUser.mockReset();
        updateManyRevokeByUser.mockReset();
        begin.mockReset();
        commit.mockReset();
        rollback.mockReset();
        fork.mockClear();

        const module: TestingModule = await Test.createTestingModule({
            controllers: [ResetPasswordPublicController],
            providers: [
                { provide: EntityManager, useValue: { fork } },
                { provide: CloudTasksQueueClient, useValue: { enqueue } },
                {
                    provide: UserService,
                    useValue: {
                        findOneActiveByEmail,
                        findOneById,
                        updatePassword,
                    },
                },
                { provide: PasswordHistoryService, useValue: { createByUser } },
                { provide: AuthService, useValue: { createPassword } },
                {
                    provide: ResetPasswordService,
                    useValue: {
                        checkActiveLatestEmailByUser,
                        inactiveEmailManyByUser,
                        requestEmailByUser,
                        checkOtp,
                        incrementOtpAttempt,
                        reset: resetEntity,
                    },
                },
                {
                    provide: SessionService,
                    useValue: { updateManyRevokeByUser },
                },
            ],
        }).compile();

        controller = module.get(ResetPasswordPublicController);
        commit.mockResolvedValue(undefined);
        enqueue.mockResolvedValue(undefined);
        updateManyRevokeByUser.mockResolvedValue(true);
    });

    it('request: enqueues RESET_PASSWORD via CloudTasksQueueClient before the request transaction commits', async () => {
        const user = { id: 'user-1', email: 'a@b.com', name: 'A' };
        const resetPassword = {
            created: { expiredDate: new Date(), to: '*@b.com' },
        };
        findOneActiveByEmail.mockResolvedValue(user);
        checkActiveLatestEmailByUser.mockResolvedValue(null);
        inactiveEmailManyByUser.mockResolvedValue(undefined);
        requestEmailByUser.mockResolvedValue(resetPassword);

        await controller.request({ email: 'a@b.com' } as any);

        expect(enqueue).toHaveBeenCalledWith(
            'email',
            ENUM_SEND_EMAIL_PROCESS.RESET_PASSWORD,
            {
                send: { email: 'a@b.com', name: 'A' },
                data: resetPassword.created,
            },
            { taskName: expect.stringMatching(/^RESET_PASSWORD-user-1-RP\d+$/) }
        );
    });

    it('request: the enqueued email payload carries the OTP (regression: /reset can never succeed without it)', async () => {
        const user = { id: 'user-1', email: 'a@b.com', name: 'A' };
        const resetPassword = {
            created: {
                url: 'https://app.example.com/reset-password?token=tok-1',
                token: 'tok-1',
                otp: '482913',
                expiredDate: new Date(),
                to: '*@b.com',
            },
        };
        findOneActiveByEmail.mockResolvedValue(user);
        checkActiveLatestEmailByUser.mockResolvedValue(null);
        inactiveEmailManyByUser.mockResolvedValue(undefined);
        requestEmailByUser.mockResolvedValue(resetPassword);

        await controller.request({ email: 'a@b.com' } as any);

        expect(enqueue).toHaveBeenCalledWith(
            'email',
            ENUM_SEND_EMAIL_PROCESS.RESET_PASSWORD,
            expect.objectContaining({
                data: expect.objectContaining({ otp: '482913' }),
            }),
            expect.anything()
        );
    });

    it('request: always sends the reset email to user.email, never the request-body email', async () => {
        const user = { id: 'user-1', email: 'real@b.com', name: 'A' };
        const resetPassword = {
            created: { expiredDate: new Date(), to: '*@b.com' },
        };
        findOneActiveByEmail.mockResolvedValue(user);
        checkActiveLatestEmailByUser.mockResolvedValue(null);
        inactiveEmailManyByUser.mockResolvedValue(undefined);
        requestEmailByUser.mockResolvedValue(resetPassword);

        // Request body email differs in case from the account's real email —
        // findOneActiveByEmail matched it, but the outgoing mail must use
        // the canonical user.email, not this raw input.
        await controller.request({ email: 'REAL@b.com' } as any);

        expect(requestEmailByUser).toHaveBeenCalledWith(
            'user-1',
            { email: 'real@b.com' },
            expect.objectContaining({ em: session })
        );
        expect(enqueue).toHaveBeenCalledWith(
            'email',
            ENUM_SEND_EMAIL_PROCESS.RESET_PASSWORD,
            expect.objectContaining({
                send: { email: 'real@b.com', name: 'A' },
            }),
            expect.anything()
        );
    });

    it('request: returns the same empty ack for an unknown email and enqueues nothing (no enumeration)', async () => {
        findOneActiveByEmail.mockResolvedValue(null);

        await expect(
            controller.request({ email: 'nobody@b.com' } as any)
        ).resolves.toEqual({ data: undefined });

        expect(enqueue).not.toHaveBeenCalled();
        expect(checkActiveLatestEmailByUser).not.toHaveBeenCalled();
        expect(requestEmailByUser).not.toHaveBeenCalled();
    });

    it('request: returns the same empty ack when a reset is already pending and enqueues nothing again', async () => {
        const user = { id: 'user-1', email: 'a@b.com', name: 'A' };
        findOneActiveByEmail.mockResolvedValue(user);
        checkActiveLatestEmailByUser.mockResolvedValue({
            resetPassword: {},
            created: {
                url: 'https://app.example.com/reset-password?token=tok-1',
                token: 'tok-1',
                expiredDate: new Date(),
                to: '*@b.com',
            },
        });

        await expect(
            controller.request({ email: 'a@b.com' } as any)
        ).resolves.toEqual({ data: undefined });

        expect(enqueue).not.toHaveBeenCalled();
        expect(requestEmailByUser).not.toHaveBeenCalled();
        expect(fork).not.toHaveBeenCalled();
    });

    it('request: known-email success also returns the same empty ack (no token/url leak)', async () => {
        const user = { id: 'user-1', email: 'a@b.com', name: 'A' };
        const resetPassword = {
            created: {
                url: 'https://app.example.com/reset-password?token=tok-1',
                token: 'tok-1',
                expiredDate: new Date(),
                to: '*@b.com',
            },
        };
        findOneActiveByEmail.mockResolvedValue(user);
        checkActiveLatestEmailByUser.mockResolvedValue(null);
        inactiveEmailManyByUser.mockResolvedValue(undefined);
        requestEmailByUser.mockResolvedValue(resetPassword);

        const result = await controller.request({ email: 'a@b.com' } as any);

        expect(result).toEqual({ data: undefined });
    });

    it('request: does not roll back the already-committed session when enqueue fails', async () => {
        const user = { id: 'user-1', email: 'a@b.com', name: 'A' };
        const resetPassword = {
            created: { expiredDate: new Date(), to: '*@b.com' },
        };
        findOneActiveByEmail.mockResolvedValue(user);
        checkActiveLatestEmailByUser.mockResolvedValue(null);
        inactiveEmailManyByUser.mockResolvedValue(undefined);
        requestEmailByUser.mockResolvedValue(resetPassword);
        enqueue.mockRejectedValue(new Error('boom'));

        await expect(
            controller.request({ email: 'a@b.com' } as any)
        ).resolves.toEqual({ data: undefined });

        // let the fire-and-forget enqueue rejection's .catch() handler run
        await new Promise(process.nextTick);

        expect(commit).toHaveBeenCalledTimes(1);
        expect(rollback).not.toHaveBeenCalled();
    });

    it('verify: OTP mismatch under the attempt limit throws OTP_NOT_MATCH and keeps the row active', async () => {
        const user = { id: 'user-2', email: 'c@d.com', name: 'C' };
        const resetPasswordEntity = {
            id: 'reset-1',
            otp: '111111',
            user: { id: 'user-2' },
        };
        findOneById.mockResolvedValue(user);
        checkOtp.mockReturnValue(false);
        incrementOtpAttempt.mockResolvedValue({
            ...resetPasswordEntity,
            otpAttempt: 3,
            isActive: true,
        });

        await expect(
            controller.verify(
                resetPasswordEntity as any,
                { otp: '000000' } as any
            )
        ).rejects.toMatchObject({
            response: {
                statusCode: ENUM_RESET_PASSWORD_STATUS_CODE_ERROR.OTP_NOT_MATCH,
                message: 'resetPassword.error.otpNotMatch',
            },
        });
    });

    it('verify: the 5th wrong OTP locks the row and throws ATTEMPT_MAX instead of OTP_NOT_MATCH', async () => {
        const user = { id: 'user-2', email: 'c@d.com', name: 'C' };
        const resetPasswordEntity = {
            id: 'reset-1',
            otp: '111111',
            user: { id: 'user-2' },
        };
        findOneById.mockResolvedValue(user);
        checkOtp.mockReturnValue(false);
        incrementOtpAttempt.mockResolvedValue({
            ...resetPasswordEntity,
            otpAttempt: 5,
            isActive: false,
        });

        await expect(
            controller.verify(
                resetPasswordEntity as any,
                { otp: '000000' } as any
            )
        ).rejects.toMatchObject({
            response: {
                statusCode: ENUM_RESET_PASSWORD_STATUS_CODE_ERROR.ATTEMPT_MAX,
                message: 'resetPassword.error.attemptMax',
            },
        });
        expect(incrementOtpAttempt).toHaveBeenCalledWith(resetPasswordEntity);
    });

    it('reset: enqueues CHANGE_PASSWORD via CloudTasksQueueClient before the reset transaction commits', async () => {
        const user = { id: 'user-2', email: 'c@d.com', name: 'C' };
        const resetPasswordEntity = { id: 'reset-1', user: { id: 'user-2' } };
        findOneById.mockResolvedValue(user);
        createPassword.mockResolvedValue({ password: 'new-hash' });
        updatePassword.mockResolvedValue(user);
        resetEntity.mockResolvedValue(undefined);
        createByUser.mockResolvedValue(undefined);

        await controller.reset(
            resetPasswordEntity as any,
            {
                newPassword: 'NewPassw0rd!',
            } as any
        );

        expect(enqueue).toHaveBeenCalledWith(
            'email',
            ENUM_SEND_EMAIL_PROCESS.CHANGE_PASSWORD,
            { send: { email: 'c@d.com', name: 'C' } },
            {
                taskName: expect.stringMatching(
                    /^CHANGE_PASSWORD-user-2-CP\d+$/
                ),
            }
        );
    });

    it('reset: revokes every session for the user inside the reset transaction', async () => {
        const user = { id: 'user-2', email: 'c@d.com', name: 'C' };
        const resetPasswordEntity = { id: 'reset-1', user: { id: 'user-2' } };
        findOneById.mockResolvedValue(user);
        createPassword.mockResolvedValue({ password: 'new-hash' });
        updatePassword.mockResolvedValue(user);
        resetEntity.mockResolvedValue(undefined);
        createByUser.mockResolvedValue(undefined);

        await controller.reset(
            resetPasswordEntity as any,
            { newPassword: 'NewPassw0rd!' } as any
        );

        expect(updateManyRevokeByUser).toHaveBeenCalledWith('user-2', {
            em: session,
        });
        expect(commit).toHaveBeenCalledTimes(1);
        expect(rollback).not.toHaveBeenCalled();
    });

    it('reset: does not roll back the already-committed session when enqueue fails', async () => {
        const user = { id: 'user-2', email: 'c@d.com', name: 'C' };
        const resetPasswordEntity = { id: 'reset-1', user: { id: 'user-2' } };
        findOneById.mockResolvedValue(user);
        createPassword.mockResolvedValue({ password: 'new-hash' });
        updatePassword.mockResolvedValue(user);
        resetEntity.mockResolvedValue(undefined);
        createByUser.mockResolvedValue(undefined);
        enqueue.mockRejectedValue(new Error('boom'));

        await expect(
            controller.reset(
                resetPasswordEntity as any,
                {
                    newPassword: 'NewPassw0rd!',
                } as any
            )
        ).resolves.toBeUndefined();

        // let the fire-and-forget enqueue rejection's .catch() handler run
        await new Promise(process.nextTick);

        expect(commit).toHaveBeenCalledTimes(1);
        expect(rollback).not.toHaveBeenCalled();
    });
});
