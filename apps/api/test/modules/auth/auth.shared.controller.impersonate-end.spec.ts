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
import { CloudTasksQueueClient } from '@app/worker/cloud-tasks-queue.client';
import { ENUM_ACTIVITY_ACTION } from '@app/modules/activity/enums/activity.enum';

import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { AuthImpersonateEndRequestDto } from 'src/modules/auth/dtos/request/auth.impersonate-end.request.dto';

describe('AuthSharedController.impersonateEnd', () => {
    let controller: AuthSharedController;

    const revokeIfActive = jest.fn();
    const createByAdmin = jest.fn();
    const fork = jest.fn();
    const getReference = jest.fn((_entity: unknown, id: string) => ({ id }));

    beforeEach(async () => {
        revokeIfActive.mockReset();
        createByAdmin.mockReset();
        fork.mockReset();
        getReference.mockClear();

        const module: TestingModule = await Test.createTestingModule({
            controllers: [AuthSharedController],
            providers: [
                {
                    provide: EntityManager,
                    useValue: { fork, getReference },
                },
                { provide: CloudTasksQueueClient, useValue: {} },
                { provide: UserService, useValue: {} },
                { provide: AuthService, useValue: {} },
                { provide: PasswordHistoryService, useValue: {} },
                {
                    provide: SessionService,
                    useValue: { revokeIfActive },
                },
                {
                    provide: ActivityService,
                    useValue: { createByAdmin },
                },
                { provide: MessageService, useValue: {} },
            ],
        }).compile();

        controller = module.get(AuthSharedController);
    });

    it('revokes the session and logs impersonate_end for an impersonation token', async () => {
        revokeIfActive.mockResolvedValue(true);

        await expect(
            controller.impersonateEnd({
                user: 'u1',
                session: 's1',
                impersonatedBy: 'admin-1',
            } as any)
        ).resolves.toEqual({ data: null });

        expect(revokeIfActive).toHaveBeenCalledWith('s1');
        expect(createByAdmin).toHaveBeenCalledWith(
            { id: 'u1' },
            'admin-1',
            expect.objectContaining({
                action: ENUM_ACTIVITY_ACTION.IMPERSONATE_END,
                metadata: { session: 's1', reason: 'manual' },
            })
        );
    });

    it('records the reason sent by the client (expired countdown)', async () => {
        revokeIfActive.mockResolvedValue(true);

        await controller.impersonateEnd(
            { user: 'u1', session: 's1', impersonatedBy: 'admin-1' } as any,
            { reason: 'expired' }
        );

        expect(createByAdmin).toHaveBeenCalledWith(
            { id: 'u1' },
            'admin-1',
            expect.objectContaining({
                metadata: { session: 's1', reason: 'expired' },
            })
        );
    });

    it('is a no-op 200 when the session is already revoked or lost the race', async () => {
        revokeIfActive.mockResolvedValue(false);

        await expect(
            controller.impersonateEnd({
                user: 'u1',
                session: 's1',
                impersonatedBy: 'admin-1',
            } as any)
        ).resolves.toEqual({ data: null });

        expect(createByAdmin).not.toHaveBeenCalled();
    });

    it('403s a normal (non-impersonation) token', async () => {
        await expect(
            controller.impersonateEnd({
                user: 'u1',
                session: 's1',
            } as any)
        ).rejects.toBeInstanceOf(ForbiddenException);

        expect(revokeIfActive).not.toHaveBeenCalled();
        expect(createByAdmin).not.toHaveBeenCalled();
    });
});

describe('AuthImpersonateEndRequestDto', () => {
    const run = (body: unknown) =>
        validate(plainToInstance(AuthImpersonateEndRequestDto, body));

    it('accepts an empty body, manual and expired', async () => {
        await expect(run({})).resolves.toHaveLength(0);
        await expect(run({ reason: 'manual' })).resolves.toHaveLength(0);
        await expect(run({ reason: 'expired' })).resolves.toHaveLength(0);
    });

    it('rejects any other reason (cannot forge expired_swept)', async () => {
        await expect(run({ reason: 'expired_swept' })).resolves.toHaveLength(1);
    });
});
