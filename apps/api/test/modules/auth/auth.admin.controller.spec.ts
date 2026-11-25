import { ENUM_POLICY_ROLE_TYPE } from 'src/modules/policy/enums/policy.enum';
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
import { ENUM_PASSWORD_HISTORY_TYPE } from '@app/modules/password-history/enums/password-history.enum';
import { ENUM_POLICY_SUBJECT } from '@app/modules/policy/enums/policy.enum';
import { SessionService } from '@app/modules/session/services/session.service';

describe('AuthAdminController.updatePassword', () => {
    let controller: AuthAdminController;

    const enqueue = jest.fn();
    const createPasswordRandom = jest.fn();
    const createPassword = jest.fn();
    const updatePassword = jest.fn();
    const resetPasswordAttempt = jest.fn();
    const createByAdmin = jest.fn();
    const activityCreateByAdmin = jest.fn();
    const updateManyRevokeByUser = jest.fn();
    const begin = jest.fn();
    const commit = jest.fn();
    const rollback = jest.fn();
    const em = { begin, commit, rollback };
    const fork = jest.fn(() => em);

    const user = {
        id: 'user-1',
        email: 'a@b.com',
        name: 'A',
        role: { type: ENUM_POLICY_ROLE_TYPE.USER },
    };
    const passwordExpired = new Date('2026-02-01T00:00:00.000Z');

    beforeEach(async () => {
        jest.clearAllMocks();

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
                {
                    provide: ActivityService,
                    useValue: { createByAdmin: activityCreateByAdmin },
                },
                {
                    provide: SessionService,
                    useValue: { updateManyRevokeByUser },
                },
            ],
        }).compile();

        controller = module.get(AuthAdminController);
        enqueue.mockResolvedValue(undefined);
        createPasswordRandom.mockReturnValue('Temp123!');
        createPassword.mockResolvedValue({
            passwordHash: 'hashed',
            passwordExpired,
        });
        updatePassword.mockImplementation(async u => u);
        resetPasswordAttempt.mockImplementation(async u => u);
    });

    describe('generated', () => {
        it('stores a temporary password, emails it and returns it once', async () => {
            await expect(
                controller.updatePassword(
                    'admin-1',
                    ENUM_POLICY_ROLE_TYPE.ADMIN,
                    user as any,
                    {},
                    'vi'
                )
            ).resolves.toEqual({ data: { password: 'Temp123!' } });

            expect(createPassword).toHaveBeenCalledWith('Temp123!', {
                temporary: true,
            });
            expect(createByAdmin).toHaveBeenCalledWith(
                user,
                { by: 'admin-1', type: ENUM_PASSWORD_HISTORY_TYPE.TEMPORARY },
                { em, actionBy: 'admin-1' }
            );
            expect(enqueue).toHaveBeenCalledWith(
                'email',
                ENUM_SEND_EMAIL_PROCESS.TEMPORARY_PASSWORD,
                {
                    send: { email: 'a@b.com', name: 'A' },
                    data: {
                        passwordExpiredAt: passwordExpired,
                        password: 'Temp123!',
                        language: 'vi',
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
            enqueue.mockRejectedValue(new Error('boom'));

            await expect(
                controller.updatePassword(
                    'admin-1',
                    ENUM_POLICY_ROLE_TYPE.ADMIN,
                    user as any,
                    {}
                )
            ).resolves.toEqual({ data: { password: 'Temp123!' } });

            expect(commit).toHaveBeenCalledTimes(1);
            expect(rollback).not.toHaveBeenCalled();
        });
    });

    // @IsOptional lets null through validation: it must not count as typed,
    // or a random password nobody knows would be stored and never shown.
    it('treats a null password as generated', async () => {
        await expect(
            controller.updatePassword(
                'admin-1',
                ENUM_POLICY_ROLE_TYPE.ADMIN,
                user as any,
                { password: null } as any
            )
        ).resolves.toEqual({ data: { password: 'Temp123!' } });

        expect(createPassword).toHaveBeenCalledWith('Temp123!', {
            temporary: true,
        });
        expect(enqueue).toHaveBeenCalledWith(
            'email',
            ENUM_SEND_EMAIL_PROCESS.TEMPORARY_PASSWORD,
            expect.anything(),
            expect.anything()
        );
    });

    describe('typed', () => {
        it('stores the typed password as a normal one and returns nothing', async () => {
            await expect(
                controller.updatePassword(
                    'admin-1',
                    ENUM_POLICY_ROLE_TYPE.ADMIN,
                    user as any,
                    { password: 'Typed123!@#' }
                )
            ).resolves.toEqual({ data: {} });

            expect(createPasswordRandom).not.toHaveBeenCalled();
            expect(createPassword).toHaveBeenCalledWith('Typed123!@#', {
                temporary: false,
            });
            expect(createByAdmin).toHaveBeenCalledWith(
                user,
                { by: 'admin-1', type: ENUM_PASSWORD_HISTORY_TYPE.CHANGE },
                { em, actionBy: 'admin-1' }
            );
        });

        // The admin shares it themselves: the email only says it changed.
        it('sends the change notice without the password', async () => {
            await controller.updatePassword(
                'admin-1',
                ENUM_POLICY_ROLE_TYPE.ADMIN,
                user as any,
                { password: 'Typed123!@#' }
            );

            expect(enqueue).toHaveBeenCalledTimes(1);
            expect(enqueue).toHaveBeenCalledWith(
                'email',
                ENUM_SEND_EMAIL_PROCESS.CHANGE_PASSWORD,
                { send: { email: 'a@b.com', name: 'A' } },
                expect.anything()
            );
            expect(JSON.stringify(enqueue.mock.calls)).not.toContain(
                'Typed123!@#'
            );
        });
    });

    it.each([
        ['generated', {}],
        ['typed', { password: 'Typed123!@#' }],
    ])(
        'signs the user out everywhere and audits a %s password',
        async (mode, body) => {
            await controller.updatePassword(
                'admin-1',
                ENUM_POLICY_ROLE_TYPE.ADMIN,
                user as any,
                body
            );

            expect(updateManyRevokeByUser).toHaveBeenCalledWith('user-1', {
                em,
            });
            expect(activityCreateByAdmin).toHaveBeenCalledWith(
                user,
                'admin-1',
                {
                    action: ENUM_ACTIVITY_ACTION.UPDATE,
                    subject: ENUM_POLICY_SUBJECT.AUTH,
                    metadata: {
                        id: 'user-1',
                        by: 'admin-1',
                        password:
                            mode === 'typed'
                                ? 'set_by_admin'
                                : 'reset_by_admin',
                    },
                },
                { em }
            );
            expect(
                JSON.stringify(activityCreateByAdmin.mock.calls)
            ).not.toMatch(/Typed123|Temp123/);
        }
    );

    it('rolls back and signs nobody out when the write fails', async () => {
        updatePassword.mockRejectedValue(new Error('db'));

        await expect(
            controller.updatePassword(
                'admin-1',
                ENUM_POLICY_ROLE_TYPE.ADMIN,
                user as any,
                { password: 'Typed123!@#' }
            )
        ).rejects.toBeDefined();

        expect(rollback).toHaveBeenCalled();
        expect(commit).not.toHaveBeenCalled();
        expect(enqueue).not.toHaveBeenCalled();
    });

    // The new password comes back in the response, so an admin resetting a
    // super admin could sign in as them.
    it.each([ENUM_POLICY_ROLE_TYPE.ADMIN, ENUM_POLICY_ROLE_TYPE.SUPER_ADMIN])(
        'refuses an ADMIN resetting a %s',
        async targetType => {
            await expect(
                controller.updatePassword(
                    'admin-1',
                    ENUM_POLICY_ROLE_TYPE.ADMIN,
                    { id: 'user-2', role: { type: targetType } } as any,
                    { password: 'Typed123!@#' }
                )
            ).rejects.toMatchObject({
                response: {
                    statusCode:
                        ENUM_AUTH_STATUS_CODE_ERROR.PASSWORD_RESET_FORBIDDEN,
                },
            });
            expect(updatePassword).not.toHaveBeenCalled();
        }
    );

    it('lets a SUPER_ADMIN reset an admin', async () => {
        const admin = { ...user, role: { type: ENUM_POLICY_ROLE_TYPE.ADMIN } };

        await expect(
            controller.updatePassword(
                'root-1',
                ENUM_POLICY_ROLE_TYPE.SUPER_ADMIN,
                admin as any,
                {}
            )
        ).resolves.toEqual({ data: { password: 'Temp123!' } });
    });
});

describe('AuthAdminController.resetMfa', () => {
    let controller: AuthAdminController;

    const mfaService = {
        disable: jest.fn(),
        revokeSessionsAndNotify: jest.fn(),
    };
    const activityService = { createByAdmin: jest.fn() };
    const userService = { clearPasswordAttempt: jest.fn() };

    beforeEach(async () => {
        jest.clearAllMocks();
        const module: TestingModule = await Test.createTestingModule({
            controllers: [AuthAdminController],
            providers: [
                { provide: EntityManager, useValue: {} },
                { provide: CloudTasksQueueClient, useValue: {} },
                { provide: AuthService, useValue: {} },
                { provide: UserService, useValue: userService },
                { provide: PasswordHistoryService, useValue: {} },
                { provide: MfaService, useValue: mfaService },
                { provide: ActivityService, useValue: activityService },
                { provide: SessionService, useValue: {} },
            ],
        }).compile();
        controller = module.get(AuthAdminController);
    });

    it('turns MFA off, signs the user out everywhere and audits the reset', async () => {
        const user = {
            id: 'user-1',
            email: 'a@b.com',
            mfaEnabled: true,
            role: { type: ENUM_POLICY_ROLE_TYPE.USER },
        };

        await controller.resetMfa(
            'admin-1',
            ENUM_POLICY_ROLE_TYPE.ADMIN,
            user as any
        );

        expect(mfaService.disable).toHaveBeenCalledWith(user);
        expect(mfaService.revokeSessionsAndNotify).toHaveBeenCalledWith(
            user,
            false
        );
        // A user locked out by attempts gets a clean slate too.
        expect(userService.clearPasswordAttempt).toHaveBeenCalledWith(user);
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
            controller.resetMfa('admin-1', ENUM_POLICY_ROLE_TYPE.ADMIN, {
                id: 'user-1',
                mfaEnabled: false,
                role: { type: ENUM_POLICY_ROLE_TYPE.USER },
            } as any)
        ).rejects.toMatchObject({
            response: {
                statusCode: ENUM_AUTH_STATUS_CODE_ERROR.MFA_NOT_ENABLED,
            },
        });
        expect(mfaService.disable).not.toHaveBeenCalled();
    });

    // Same hierarchy as impersonation: an admin may only act on users.
    it.each([ENUM_POLICY_ROLE_TYPE.ADMIN, ENUM_POLICY_ROLE_TYPE.SUPER_ADMIN])(
        'refuses an ADMIN resetting a %s',
        async targetType => {
            await expect(
                controller.resetMfa('admin-1', ENUM_POLICY_ROLE_TYPE.ADMIN, {
                    id: 'user-2',
                    mfaEnabled: true,
                    role: { type: targetType },
                } as any)
            ).rejects.toMatchObject({
                response: {
                    statusCode: ENUM_AUTH_STATUS_CODE_ERROR.MFA_RESET_FORBIDDEN,
                },
            });
            expect(mfaService.disable).not.toHaveBeenCalled();
        }
    );

    it('lets a SUPER_ADMIN reset an admin', async () => {
        await controller.resetMfa('root-1', ENUM_POLICY_ROLE_TYPE.SUPER_ADMIN, {
            id: 'user-2',
            mfaEnabled: true,
            role: { type: ENUM_POLICY_ROLE_TYPE.ADMIN },
        } as any);
        expect(mfaService.disable).toHaveBeenCalled();
    });
});
