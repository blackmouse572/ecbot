import { ForbiddenException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { EntityManager } from '@mikro-orm/postgresql';
import { AuthSharedController } from '@app/modules/auth/controllers/auth.shared.controller';
import { UserService } from '@app/modules/user/services/user.service';
import { AuthService } from '@app/modules/auth/services/auth.service';
import { PasswordHistoryService } from '@app/modules/password-history/services/password-history.service';
import { SessionService } from '@app/modules/session/services/session.service';
import { ActivityService } from '@app/modules/activity/services/activity.service';
import { MessageService } from '@app/common/message/services/message.service';
import { ImpersonationService } from '@app/modules/auth/services/impersonation.service';
import { CloudTasksQueueClient } from '@app/worker/cloud-tasks-queue.client';

describe('AuthSharedController.impersonateEnd', () => {
    let controller: AuthSharedController;

    const findOneById = jest.fn();
    const endImpersonation = jest.fn();

    beforeEach(async () => {
        findOneById.mockReset();
        endImpersonation.mockReset().mockResolvedValue(true);

        const module: TestingModule = await Test.createTestingModule({
            controllers: [AuthSharedController],
            providers: [
                { provide: EntityManager, useValue: {} },
                { provide: CloudTasksQueueClient, useValue: {} },
                { provide: UserService, useValue: {} },
                { provide: AuthService, useValue: {} },
                { provide: PasswordHistoryService, useValue: {} },
                {
                    provide: SessionService,
                    useValue: { findOneById, endImpersonation },
                },
                { provide: ActivityService, useValue: {} },
                { provide: MessageService, useValue: {} },
                { provide: ImpersonationService, useValue: {} },
            ],
        }).compile();

        controller = module.get(AuthSharedController);
    });

    const payload = {
        user: 'u1',
        session: 's1',
        impersonatedBy: 'admin-1',
    } as any;

    it('ends the session as "manual" while the token is still live', async () => {
        findOneById.mockResolvedValue({
            expiredAt: new Date(Date.now() + 60_000),
        });

        await expect(controller.impersonateEnd(payload)).resolves.toEqual({
            data: null,
        });

        expect(endImpersonation).toHaveBeenCalledWith('s1', 'manual');
    });

    it('decides the reason itself: a session past its expiry ends as "expired"', async () => {
        findOneById.mockResolvedValue({
            expiredAt: new Date(Date.now() - 1_000),
        });

        await controller.impersonateEnd(payload);

        expect(endImpersonation).toHaveBeenCalledWith('s1', 'expired');
    });

    it('is a no-op 200 when the session was already ended (the service reports false)', async () => {
        findOneById.mockResolvedValue({
            expiredAt: new Date(Date.now() + 60_000),
        });
        endImpersonation.mockResolvedValue(false);

        await expect(controller.impersonateEnd(payload)).resolves.toEqual({
            data: null,
        });
    });

    it('403s a normal (non-impersonation) token', async () => {
        await expect(
            controller.impersonateEnd({ user: 'u1', session: 's1' } as any)
        ).rejects.toBeInstanceOf(ForbiddenException);

        expect(endImpersonation).not.toHaveBeenCalled();
    });
});
