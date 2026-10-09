import { Test, TestingModule } from '@nestjs/testing';
import { EntityManager } from '@mikro-orm/postgresql';
import { AuthAdminController } from '@app/modules/auth/controllers/auth.admin.controller';
import { AuthService } from '@app/modules/auth/services/auth.service';
import { UserService } from '@app/modules/user/services/user.service';
import { PasswordHistoryService } from '@app/modules/password-history/services/password-history.service';
import { CloudTasksQueueClient } from '@app/worker/cloud-tasks-queue.client';
import { ENUM_SEND_EMAIL_PROCESS } from '@app/modules/email/enums/email.enum';
import { MfaService } from '@app/modules/auth/services/mfa.service';
import { ActivityService } from '@app/modules/activity/services/activity.service';
import { ENUM_ACTIVITY_ACTION } from '@app/modules/activity/enums/activity.enum';
import { ENUM_AUTH_STATUS_CODE_ERROR } from '@app/modules/auth/enums/auth.status-code.enum';

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
                { provide: MfaService, useValue: {} },
                { provide: ActivityService, useValue: {} },
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
                    /^TEMPORARY_PASSWORD-user-1-[0-9a-f-]{36}$/
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

describe('AuthAdminController.resetMfa', () => {
    let controller: AuthAdminController;

    const mfaService = {
        disable: jest.fn(),
        revokeSessionsAndNotify: jest.fn(),
    };
    const activityService = { createByAdmin: jest.fn() };

    beforeEach(async () => {
        jest.clearAllMocks();
        const module: TestingModule = await Test.createTestingModule({
            controllers: [AuthAdminController],
            providers: [
                { provide: EntityManager, useValue: {} },
                { provide: CloudTasksQueueClient, useValue: {} },
                { provide: AuthService, useValue: {} },
                { provide: UserService, useValue: {} },
                { provide: PasswordHistoryService, useValue: {} },
                { provide: MfaService, useValue: mfaService },
                { provide: ActivityService, useValue: activityService },
            ],
        }).compile();
        controller = module.get(AuthAdminController);
    });

    it('turns MFA off, signs the user out everywhere and audits the reset', async () => {
        const user = { id: 'user-1', email: 'a@b.com', mfaEnabled: true };

        await controller.resetMfa('admin-1', user as any);

        expect(mfaService.disable).toHaveBeenCalledWith(user);
        expect(mfaService.revokeSessionsAndNotify).toHaveBeenCalledWith(
            user,
            false
        );
        expect(activityService.createByAdmin).toHaveBeenCalledWith(
            user,
            'admin-1',
            expect.objectContaining({
                action: ENUM_ACTIVITY_ACTION.UPDATE,
                metadata: {
                    id: 'user-1',
                    by: 'admin-1',
                    mfa: 'reset_by_admin',
                },
            })
        );
    });

    it('refuses a user without MFA', async () => {
        await expect(
            controller.resetMfa('admin-1', {
                id: 'user-1',
                mfaEnabled: false,
            } as any)
        ).rejects.toMatchObject({
            response: {
                statusCode: ENUM_AUTH_STATUS_CODE_ERROR.MFA_NOT_ENABLED,
            },
        });
        expect(mfaService.disable).not.toHaveBeenCalled();
    });
});
