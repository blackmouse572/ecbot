import { Test, TestingModule } from '@nestjs/testing';
import { EntityManager } from '@mikro-orm/postgresql';
import { AuthAdminController } from '@app/modules/auth/controllers/auth.admin.controller';
import { AuthService } from '@app/modules/auth/services/auth.service';
import { UserService } from '@app/modules/user/services/user.service';
import { PasswordHistoryService } from '@app/modules/password-history/services/password-history.service';
import { CloudTasksQueueClient } from '@app/worker/cloud-tasks-queue.client';
import { ENUM_SEND_EMAIL_PROCESS } from '@app/modules/email/enums/email.enum';

describe('AuthAdminController.updatePassword', () => {
    let controller: AuthAdminController;

    const enqueue = jest.fn();
    const createPasswordRandom = jest.fn();
    const createPassword = jest.fn();
    const updatePassword = jest.fn();
    const resetPasswordAttempt = jest.fn();
    const createByAdmin = jest.fn();
    const begin = jest.fn();
    const commit = jest.fn();
    const rollback = jest.fn();
    const fork = jest.fn(() => ({ begin, commit, rollback }));

    beforeEach(async () => {
        enqueue.mockReset();
        createPasswordRandom.mockReset();
        createPassword.mockReset();
        updatePassword.mockReset();
        resetPasswordAttempt.mockReset();
        createByAdmin.mockReset();
        begin.mockReset();
        commit.mockReset();
        rollback.mockReset();
        fork.mockClear();

        const module: TestingModule = await Test.createTestingModule({
            controllers: [AuthAdminController],
            providers: [
                { provide: EntityManager, useValue: { fork } },
                { provide: CloudTasksQueueClient, useValue: { enqueue } },
                {
                    provide: AuthService,
                    useValue: { createPasswordRandom, createPassword },
                },
                {
                    provide: UserService,
                    useValue: { updatePassword, resetPasswordAttempt },
                },
                {
                    provide: PasswordHistoryService,
                    useValue: { createByAdmin },
                },
            ],
        }).compile();

        controller = module.get(AuthAdminController);
        enqueue.mockResolvedValue(undefined);
    });

    it('enqueues TEMPORARY_PASSWORD via CloudTasksQueueClient after the reset transaction commits', async () => {
        const user = { id: 'user-1', email: 'a@b.com', name: 'A' };
        const passwordExpired = new Date('2026-02-01T00:00:00.000Z');
        createPasswordRandom.mockReturnValue('Temp123!');
        createPassword.mockResolvedValue({
            password: 'hashed',
            passwordExpired,
        });
        updatePassword.mockResolvedValue(user);
        resetPasswordAttempt.mockResolvedValue(user);
        createByAdmin.mockResolvedValue(undefined);
        commit.mockResolvedValue(undefined);

        await controller.updatePassword('admin-1', user as any);

        expect(enqueue).toHaveBeenCalledWith(
            'email',
            ENUM_SEND_EMAIL_PROCESS.TEMPORARY_PASSWORD,
            {
                send: { email: 'a@b.com', name: 'A' },
                data: {
                    passwordExpiredAt: passwordExpired,
                    password: 'Temp123!',
                },
            },
            {
                taskName: expect.stringMatching(
                    /^TEMPORARY_PASSWORD-user-1-TP\d+$/
                ),
            }
        );
    });

    it('does not roll back the already-committed session when enqueue fails', async () => {
        const user = { id: 'user-1', email: 'a@b.com', name: 'A' };
        const passwordExpired = new Date('2026-02-01T00:00:00.000Z');
        createPasswordRandom.mockReturnValue('Temp123!');
        createPassword.mockResolvedValue({
            password: 'hashed',
            passwordExpired,
        });
        updatePassword.mockResolvedValue(user);
        resetPasswordAttempt.mockResolvedValue(user);
        createByAdmin.mockResolvedValue(undefined);
        commit.mockResolvedValue(undefined);
        enqueue.mockRejectedValue(new Error('boom'));

        await expect(
            controller.updatePassword('admin-1', user as any)
        ).resolves.toBeUndefined();

        expect(commit).toHaveBeenCalledTimes(1);
        expect(rollback).not.toHaveBeenCalled();
    });
});
