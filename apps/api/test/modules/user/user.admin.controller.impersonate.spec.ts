import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import { ClsService } from 'nestjs-cls';
import { UserAdminController } from '@app/modules/user/controllers/user.admin.controller';
import { PaginationService } from '@app/common/pagination/services/pagination.service';
import { DatabaseService } from '@app/common/database/services/database.service';
import { HelperArrayService } from '@app/common/helper/services/helper.array.service';
import { RoleService } from '@app/modules/role/services/role.service';
import { AuthService } from '@app/modules/auth/services/auth.service';
import { ImpersonationService } from '@app/modules/auth/services/impersonation.service';
import { SessionService } from '@app/modules/session/services/session.service';
import { UserService } from '@app/modules/user/services/user.service';
import { CountryService } from '@app/modules/country/services/country.service';
import { PasswordHistoryService } from '@app/modules/password-history/services/password-history.service';
import { ActivityService } from '@app/modules/activity/services/activity.service';
import { VerificationService } from '@app/modules/verification/services/verification.service';
import { CloudTasksQueueClient } from '@app/worker/cloud-tasks-queue.client';
import { ENUM_ACTIVITY_ACTION } from '@app/modules/activity/enums/activity.enum';

describe('UserAdminController.impersonate', () => {
    let controller: UserAdminController;

    const createImpersonation = jest.fn();
    const setLoginSession = jest.fn();
    const createImpersonationToken = jest.fn();
    const issue = jest.fn();
    const createByAdmin = jest.fn();
    const transactional = jest.fn((cb: any) => cb({}));

    const activeUser = {
        id: 'target-1',
        name: 'Nguyen Van A',
        email: 'a@example.com',
        status: 'ACTIVE',
        role: { id: 'r-user', type: 'USER' },
    };

    const build = async () => {
        const module: TestingModule = await Test.createTestingModule({
            controllers: [UserAdminController],
            providers: [
                { provide: EntityManager, useValue: { transactional } },
                {
                    provide: CloudTasksQueueClient,
                    useValue: { enqueue: jest.fn() },
                },
                { provide: PaginationService, useValue: {} },
                { provide: ClsService, useValue: {} },
                { provide: DatabaseService, useValue: {} },
                { provide: HelperArrayService, useValue: {} },
                { provide: RoleService, useValue: {} },
                {
                    provide: AuthService,
                    useValue: { createImpersonationToken },
                },
                { provide: ImpersonationService, useValue: { issue } },
                {
                    provide: SessionService,
                    useValue: { createImpersonation, setLoginSession },
                },
                { provide: UserService, useValue: {} },
                { provide: CountryService, useValue: {} },
                { provide: PasswordHistoryService, useValue: {} },
                { provide: ActivityService, useValue: { createByAdmin } },
                { provide: VerificationService, useValue: {} },
            ],
        }).compile();
        return module.get(UserAdminController);
    };

    beforeEach(async () => {
        jest.clearAllMocks();
        createImpersonation.mockResolvedValue({
            id: 'session-1',
            expiredAt: new Date('2026-09-02T00:10:00.000Z'),
        });
        createImpersonationToken.mockReturnValue({
            tokenType: 'Bearer',
            roleType: 'USER',
            expiresIn: 600,
            accessToken: 'signed.jwt',
        });
        issue.mockResolvedValue('handoff-code');
        controller = await build();
    });

    it('returns only { code, expiresIn } and logs impersonate_start', async () => {
        const req: any = { headers: {}, ip: '1.1.1.1' };

        const res = await controller.impersonate(
            activeUser as any,
            'admin-1',
            req
        );

        expect(res).toEqual({ data: { code: 'handoff-code', expiresIn: 600 } });
        expect(setLoginSession).toHaveBeenCalledWith(
            activeUser,
            expect.objectContaining({ id: 'session-1' }),
            600_000
        );
        expect(issue).toHaveBeenCalledWith(
            expect.objectContaining({
                accessToken: 'signed.jwt',
                impersonatedBy: 'admin-1',
                session: 'session-1',
                target: {
                    id: 'target-1',
                    name: 'Nguyen Van A',
                    email: 'a@example.com',
                },
            })
        );
        expect(createByAdmin).toHaveBeenCalledWith(
            activeUser,
            'admin-1',
            expect.objectContaining({
                action: ENUM_ACTIVITY_ACTION.IMPERSONATE_START,
                subject: 'USER',
            }),
            expect.objectContaining({ em: expect.anything() })
        );
    });

    it('rejects a non-USER target', async () => {
        const admin = { ...activeUser, role: { id: 'r-admin', type: 'ADMIN' } };
        await expect(
            controller.impersonate(admin as any, 'admin-1', {
                headers: {},
            } as any)
        ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('rejects a non-ACTIVE target', async () => {
        const blocked = { ...activeUser, status: 'BLOCKED' };
        await expect(
            controller.impersonate(blocked as any, 'admin-1', {
                headers: {},
            } as any)
        ).rejects.toBeInstanceOf(ForbiddenException);
    });
});
