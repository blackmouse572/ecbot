import { Test, TestingModule } from '@nestjs/testing';
import { EntityManager } from '@mikro-orm/postgresql';
import { ClsService } from 'nestjs-cls';
import { UserAdminController } from '@app/modules/user/controllers/user.admin.controller';
import { PaginationService } from '@app/common/pagination/services/pagination.service';
import { DatabaseService } from '@app/common/database/services/database.service';
import { HelperArrayService } from '@app/common/helper/services/helper.array.service';
import { RoleService } from '@app/modules/role/services/role.service';
import { AuthService } from '@app/modules/auth/services/auth.service';
import { UserService } from '@app/modules/user/services/user.service';
import { CountryService } from '@app/modules/country/services/country.service';
import { PasswordHistoryService } from '@app/modules/password-history/services/password-history.service';
import { ActivityService } from '@app/modules/activity/services/activity.service';
import { VerificationService } from '@app/modules/verification/services/verification.service';
import { CloudTasksQueueClient } from '@app/worker/cloud-tasks-queue.client';
import { ENUM_SEND_EMAIL_PROCESS } from '@app/modules/email/enums/email.enum';

describe('UserAdminController.create', () => {
    let controller: UserAdminController;

    const enqueue = jest.fn();
    const findOneByIdRole = jest.fn();
    const existByEmail = jest.fn();
    const findOneByIdCountry = jest.fn();
    const createPasswordRandom = jest.fn();
    const createPassword = jest.fn();
    const create = jest.fn();
    const createEmailByUser = jest.fn();
    const createByAdminPasswordHistory = jest.fn();
    const createByAdminActivity = jest.fn();
    const transactional = jest.fn((cb: any) => cb({}));

    const created = { id: 'user-1', email: 'created@x.com', name: 'Created' };
    const verification = {
        otp: '654321',
        expiredDate: new Date('2026-03-01T00:00:00.000Z'),
        reference: 'ref-create-1',
    };
    const passwordExpired = new Date('2026-04-01T00:00:00.000Z');

    beforeEach(async () => {
        enqueue.mockReset();
        findOneByIdRole.mockReset();
        existByEmail.mockReset();
        findOneByIdCountry.mockReset();
        createPasswordRandom.mockReset();
        createPassword.mockReset();
        create.mockReset();
        createEmailByUser.mockReset();
        createByAdminPasswordHistory.mockReset();
        createByAdminActivity.mockReset();
        transactional.mockClear();

        const module: TestingModule = await Test.createTestingModule({
            controllers: [UserAdminController],
            providers: [
                { provide: EntityManager, useValue: { transactional } },
                { provide: CloudTasksQueueClient, useValue: { enqueue } },
                { provide: PaginationService, useValue: {} },
                // Inert mocks required only to satisfy TestingModule.compile(): Nest
                // eagerly instantiates the parameter pipes referenced by this
                // controller's other routes (list's PaginationQueryFilter* pipes,
                // update/updateStatus's UserNotSelfPipe) even though this spec only
                // exercises `create`.
                { provide: ClsService, useValue: {} },
                { provide: DatabaseService, useValue: {} },
                { provide: HelperArrayService, useValue: {} },
                {
                    provide: RoleService,
                    useValue: { findOneById: findOneByIdRole },
                },
                {
                    provide: AuthService,
                    useValue: { createPasswordRandom, createPassword },
                },
                { provide: UserService, useValue: { existByEmail, create } },
                {
                    provide: CountryService,
                    useValue: { findOneById: findOneByIdCountry },
                },
                {
                    provide: PasswordHistoryService,
                    useValue: { createByAdmin: createByAdminPasswordHistory },
                },
                {
                    provide: ActivityService,
                    useValue: { createByAdmin: createByAdminActivity },
                },
                {
                    provide: VerificationService,
                    useValue: { createEmailByUser },
                },
            ],
        }).compile();

        controller = module.get(UserAdminController);

        findOneByIdRole.mockResolvedValue({ id: 'role-1' });
        existByEmail.mockResolvedValue(false);
        findOneByIdCountry.mockResolvedValue({ id: 'country-1' });
        createPasswordRandom.mockReturnValue('Temp123!');
        createPassword.mockReturnValue({ password: 'hashed', passwordExpired });
        create.mockResolvedValue(created);
        createEmailByUser.mockResolvedValue(verification);
        createByAdminPasswordHistory.mockResolvedValue(undefined);
        createByAdminActivity.mockResolvedValue(undefined);
    });

    it('enqueues CREATE via CloudTasksQueueClient inside the create transaction', async () => {
        await controller.create('admin-1', {
            email: 'created@x.com',
            role: 'role-1',
            name: 'Created',
            country: 'country-1',
            gender: 'MALE',
        } as any);

        expect(enqueue).toHaveBeenCalledWith(
            'email',
            ENUM_SEND_EMAIL_PROCESS.CREATE,
            {
                send: { email: 'created@x.com', name: 'Created' },
                data: {
                    passwordExpiredAt: passwordExpired,
                    password: 'Temp123!',
                },
            },
            { taskName: 'CREATE-user-1' }
        );
    });

    it('enqueues VERIFICATION via CloudTasksQueueClient inside the create transaction', async () => {
        await controller.create('admin-1', {
            email: 'created@x.com',
            role: 'role-1',
            name: 'Created',
            country: 'country-1',
            gender: 'MALE',
        } as any);

        expect(enqueue).toHaveBeenCalledWith(
            'email',
            ENUM_SEND_EMAIL_PROCESS.VERIFICATION,
            {
                send: { email: 'created@x.com', name: 'Created' },
                data: {
                    otp: '654321',
                    expiredAt: verification.expiredDate,
                    reference: 'ref-create-1',
                },
            },
            { taskName: 'VERIFICATION-user-1' }
        );
    });

    it('resolves successfully when CloudTasksQueueClient.enqueue rejects (enqueue failure must not roll back user creation)', async () => {
        enqueue.mockRejectedValue(new Error('boom'));

        await expect(
            controller.create('admin-1', {
                email: 'created@x.com',
                role: 'role-1',
                name: 'Created',
                country: 'country-1',
                gender: 'MALE',
            } as any)
        ).resolves.toEqual({ data: { id: 'user-1' } });
    });
});

describe('UserAdminController.updateStatus', () => {
    let controller: UserAdminController;

    const enqueue = jest.fn();
    const updateStatus = jest.fn();
    const createByAdminActivity = jest.fn();
    const transactional = jest.fn((cb: any) => cb({}));

    const targetUser = {
        id: 'user-2',
        email: 'target@x.com',
        name: 'Target',
        status: 'ACTIVE',
    };
    const payload = { user: { id: 'admin-1' } };

    beforeEach(async () => {
        enqueue.mockReset();
        updateStatus.mockReset();
        createByAdminActivity.mockReset();
        transactional.mockClear();

        const module: TestingModule = await Test.createTestingModule({
            controllers: [UserAdminController],
            providers: [
                { provide: EntityManager, useValue: { transactional } },
                { provide: CloudTasksQueueClient, useValue: { enqueue } },
                { provide: PaginationService, useValue: {} },
                { provide: ClsService, useValue: {} },
                { provide: DatabaseService, useValue: {} },
                { provide: HelperArrayService, useValue: {} },
                { provide: RoleService, useValue: {} },
                { provide: AuthService, useValue: {} },
                { provide: UserService, useValue: { updateStatus } },
                { provide: CountryService, useValue: {} },
                { provide: PasswordHistoryService, useValue: {} },
                {
                    provide: ActivityService,
                    useValue: { createByAdmin: createByAdminActivity },
                },
                { provide: VerificationService, useValue: {} },
            ],
        }).compile();

        controller = module.get(UserAdminController);

        updateStatus.mockResolvedValue(undefined);
        createByAdminActivity.mockResolvedValue(undefined);
    });

    it('enqueues ACCOUNT_BANNED via CloudTasksQueueClient when status is set to BLOCKED', async () => {
        await controller.updateStatus(
            { ...targetUser } as any,
            { status: 'BLOCKED' } as any,
            payload as any
        );

        expect(enqueue).toHaveBeenCalledWith(
            'email',
            ENUM_SEND_EMAIL_PROCESS.ACCOUNT_BANNED,
            { send: { email: 'target@x.com', name: 'Target' } },
            { taskName: 'ACCOUNT_BANNED-user-2' }
        );
    });

    it('does not enqueue ACCOUNT_BANNED when status is set to ACTIVE or INACTIVE', async () => {
        await controller.updateStatus(
            { ...targetUser } as any,
            { status: 'INACTIVE' } as any,
            payload as any
        );

        expect(enqueue).not.toHaveBeenCalled();
    });

    it('does not fail the status update when CloudTasksQueueClient.enqueue rejects', async () => {
        enqueue.mockRejectedValue(new Error('boom'));

        await expect(
            controller.updateStatus(
                { ...targetUser } as any,
                { status: 'BLOCKED' } as any,
                payload as any
            )
        ).resolves.toBeDefined();
    });
});
