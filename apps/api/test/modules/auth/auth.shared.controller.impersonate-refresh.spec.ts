import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
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
import { ENUM_SESSION_STATUS_CODE_ERROR } from '@app/modules/session/enums/session.status-code.enum';

describe('AuthSharedController.impersonateRefresh', () => {
    let controller: AuthSharedController;

    const findOneActiveById = jest.fn();
    const setLoginSession = jest.fn();
    const findOneById = jest.fn();
    const createImpersonationToken = jest.fn();

    const payload = {
        user: 'u1',
        session: 's1',
        impersonatedBy: 'admin-1',
    } as any;
    const target = { id: 'u1', status: 'ACTIVE', role: { type: 'USER' } };

    beforeEach(async () => {
        jest.useFakeTimers().setSystemTime(new Date('2026-10-07T10:00:00Z'));
        [
            findOneActiveById,
            setLoginSession,
            findOneById,
            createImpersonationToken,
        ].forEach(m => m.mockReset());

        const module: TestingModule = await Test.createTestingModule({
            controllers: [AuthSharedController],
            providers: [
                { provide: EntityManager, useValue: {} },
                { provide: CloudTasksQueueClient, useValue: {} },
                { provide: UserService, useValue: { findOneById } },
                {
                    provide: AuthService,
                    useValue: { createImpersonationToken },
                },
                { provide: PasswordHistoryService, useValue: {} },
                {
                    provide: SessionService,
                    useValue: { findOneActiveById, setLoginSession },
                },
                { provide: ActivityService, useValue: {} },
                { provide: MessageService, useValue: {} },
            ],
        }).compile();

        controller = module.get(AuthSharedController);
    });

    afterEach(() => jest.useRealTimers());

    it('issues a new token capped to the session time left and re-arms the kill switch', async () => {
        const session = {
            id: 's1',
            expiredAt: new Date('2026-10-07T10:01:30Z'),
        };
        findOneActiveById.mockResolvedValue(session);
        findOneById.mockResolvedValue(target);
        createImpersonationToken.mockReturnValue({
            tokenType: 'Bearer',
            roleType: 'USER',
            expiresIn: 90,
            accessToken: 'new.jwt',
        });

        const res = await controller.impersonateRefresh(payload);

        // 90s left in the session => the cap handed to the token service
        expect(createImpersonationToken).toHaveBeenCalledWith(
            target,
            's1',
            'admin-1',
            90
        );
        expect(setLoginSession).toHaveBeenCalledWith(target, session, 90_000);
        expect(res).toEqual({
            data: {
                tokenType: 'Bearer',
                roleType: 'USER',
                expiresIn: 90,
                accessToken: 'new.jwt',
            },
        });
    });

    it('401s (EXPIRED) when the session is past its absolute cap', async () => {
        findOneActiveById.mockResolvedValue({
            id: 's1',
            expiredAt: new Date('2026-10-07T09:59:59Z'),
        });

        await expect(
            controller.impersonateRefresh(payload)
        ).rejects.toMatchObject({
            response: {
                statusCode: ENUM_SESSION_STATUS_CODE_ERROR.EXPIRED,
                message: 'session.error.expired',
            },
        });
        expect(createImpersonationToken).not.toHaveBeenCalled();
        expect(setLoginSession).not.toHaveBeenCalled();
    });

    it('401s when the session was revoked / is no longer ACTIVE', async () => {
        findOneActiveById.mockResolvedValue(null);

        await expect(
            controller.impersonateRefresh(payload)
        ).rejects.toBeInstanceOf(UnauthorizedException);
        expect(createImpersonationToken).not.toHaveBeenCalled();
    });

    it('401s when the target user is no longer active', async () => {
        findOneActiveById.mockResolvedValue({
            id: 's1',
            expiredAt: new Date('2026-10-07T11:00:00Z'),
        });
        findOneById.mockResolvedValue({ ...target, status: 'BLOCKED' });

        await expect(
            controller.impersonateRefresh(payload)
        ).rejects.toBeInstanceOf(UnauthorizedException);
        expect(createImpersonationToken).not.toHaveBeenCalled();
    });

    it('403s a normal (non-impersonation) token', async () => {
        await expect(
            controller.impersonateRefresh({ user: 'u1', session: 's1' } as any)
        ).rejects.toBeInstanceOf(ForbiddenException);
        expect(findOneActiveById).not.toHaveBeenCalled();
    });
});
