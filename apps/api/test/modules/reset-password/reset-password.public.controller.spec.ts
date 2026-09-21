import { Test, TestingModule } from '@nestjs/testing';
import { EntityManager } from '@mikro-orm/postgresql';
import { ResetPasswordPublicController } from '@app/modules/reset-password/controllers/reset-password.public.controller';
import { UserService } from '@app/modules/user/services/user.service';
import { PasswordHistoryService } from '@app/modules/password-history/services/password-history.service';
import { AuthService } from '@app/modules/auth/services/auth.service';
import { ResetPasswordService } from '@app/modules/reset-password/services/reset-password.service';
import { CloudTasksQueueClient } from '@app/worker/cloud-tasks-queue.client';
import { ENUM_SEND_EMAIL_PROCESS } from '@app/modules/email/enums/email.enum';

describe('ResetPasswordPublicController — email dispatch', () => {
    let controller: ResetPasswordPublicController;

    const enqueue = jest.fn();
    const findOneActiveByEmail = jest.fn();
    const findOneById = jest.fn();
    const checkActiveLatestEmailByUser = jest.fn();
    const inactiveEmailManyByUser = jest.fn();
    const requestEmailByUser = jest.fn();
    const createPassword = jest.fn();
    const updatePassword = jest.fn();
    const resetEntity = jest.fn();
    const createByUser = jest.fn();
    const begin = jest.fn();
    const commit = jest.fn();
    const rollback = jest.fn();
    const fork = jest.fn(() => ({ begin, commit, rollback }));

    beforeEach(async () => {
        enqueue.mockReset();
        findOneActiveByEmail.mockReset();
        findOneById.mockReset();
        checkActiveLatestEmailByUser.mockReset();
        inactiveEmailManyByUser.mockReset();
        requestEmailByUser.mockReset();
        createPassword.mockReset();
        updatePassword.mockReset();
        resetEntity.mockReset();
        createByUser.mockReset();
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
                        reset: resetEntity,
                    },
                },
            ],
        }).compile();

        controller = module.get(ResetPasswordPublicController);
        commit.mockResolvedValue(undefined);
        enqueue.mockResolvedValue(undefined);
    });

    it('request: enqueues RESET_PASSWORD via CloudTasksQueueClient before the request transaction commits', async () => {
        const user = { id: 'user-1', email: 'a@b.com', name: 'A' };
        const resetPassword = { created: { token: 'tok-1' } };
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

    it('reset: enqueues CHANGE_PASSWORD via CloudTasksQueueClient before the reset transaction commits', async () => {
        const user = { id: 'user-2', email: 'c@d.com', name: 'C' };
        const resetPasswordEntity = { id: 'reset-1', user: { id: 'user-2' } };
        findOneById.mockResolvedValue(user);
        createPassword.mockReturnValue({ password: 'new-hash' });
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

    it('request: does not roll back the already-committed session when enqueue fails', async () => {
        const user = { id: 'user-1', email: 'a@b.com', name: 'A' };
        const resetPassword = { created: { token: 'tok-1' } };
        findOneActiveByEmail.mockResolvedValue(user);
        checkActiveLatestEmailByUser.mockResolvedValue(null);
        inactiveEmailManyByUser.mockResolvedValue(undefined);
        requestEmailByUser.mockResolvedValue(resetPassword);
        enqueue.mockRejectedValue(new Error('boom'));

        await expect(
            controller.request({ email: 'a@b.com' } as any)
        ).resolves.toEqual({ data: resetPassword.created });

        // let the fire-and-forget enqueue rejection's .catch() handler run
        await new Promise(process.nextTick);

        expect(commit).toHaveBeenCalledTimes(1);
        expect(rollback).not.toHaveBeenCalled();
    });

    it('reset: does not roll back the already-committed session when enqueue fails', async () => {
        const user = { id: 'user-2', email: 'c@d.com', name: 'C' };
        const resetPasswordEntity = { id: 'reset-1', user: { id: 'user-2' } };
        findOneById.mockResolvedValue(user);
        createPassword.mockReturnValue({ password: 'new-hash' });
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
