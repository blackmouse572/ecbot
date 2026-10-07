import { ForbiddenException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { EntityManager } from '@mikro-orm/postgresql';
import { AuthSharedController } from '@app/modules/auth/controllers/auth.shared.controller';
import { UserService } from '@app/modules/user/services/user.service';
import { AuthService } from '@app/modules/auth/services/auth.service';
import { ImpersonationService } from '@app/modules/auth/services/impersonation.service';
import { PasswordHistoryService } from '@app/modules/password-history/services/password-history.service';
import { SessionService } from '@app/modules/session/services/session.service';
import { ActivityService } from '@app/modules/activity/services/activity.service';
import { MessageService } from '@app/common/message/services/message.service';
import { CloudTasksQueueClient } from '@app/worker/cloud-tasks-queue.client';

// The eligibility / cap / nonce / race logic is covered in
// impersonation.service.spec.ts; the controller only guards the token type and
// shapes the response.
describe('AuthSharedController.impersonateRefresh', () => {
    let controller: AuthSharedController;
    const renew = jest.fn();

    beforeEach(async () => {
        renew.mockReset();
        const module: TestingModule = await Test.createTestingModule({
            controllers: [AuthSharedController],
            providers: [
                { provide: EntityManager, useValue: {} },
                { provide: CloudTasksQueueClient, useValue: {} },
                { provide: UserService, useValue: {} },
                { provide: AuthService, useValue: {} },
                { provide: PasswordHistoryService, useValue: {} },
                { provide: SessionService, useValue: {} },
                { provide: ActivityService, useValue: {} },
                { provide: MessageService, useValue: {} },
                { provide: ImpersonationService, useValue: { renew } },
            ],
        }).compile();

        controller = module.get(AuthSharedController);
    });

    const payload = {
        user: 'u1',
        session: 's1',
        impersonatedBy: 'admin-1',
        impersonationNonce: 'n1',
    } as any;

    it('returns the renewed token and when the whole session ends', async () => {
        renew.mockResolvedValue({
            issued: {
                tokenType: 'Bearer',
                roleType: 'USER',
                expiresIn: 600,
                accessToken: 'new.jwt',
            },
            sessionEndsAt: 1_791_130_000_000,
        });

        const res = await controller.impersonateRefresh(payload);

        expect(renew).toHaveBeenCalledWith(payload);
        expect(res).toEqual({
            data: {
                tokenType: 'Bearer',
                roleType: 'USER',
                expiresIn: 600,
                accessToken: 'new.jwt',
                sessionEndsAt: 1_791_130_000_000,
            },
        });
    });

    it('403s a normal (non-impersonation) token without calling the service', async () => {
        await expect(
            controller.impersonateRefresh({ user: 'u1', session: 's1' } as any)
        ).rejects.toBeInstanceOf(ForbiddenException);
        expect(renew).not.toHaveBeenCalled();
    });

    it('passes the service rejection straight through (session over)', async () => {
        renew.mockRejectedValue(new Error('401'));

        await expect(controller.impersonateRefresh(payload)).rejects.toThrow(
            '401'
        );
    });
});
