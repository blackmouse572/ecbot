import { ENUM_FOLLOWUP_STATUS } from '@app/modules/platform/constants/followup.constant';
import { FollowupService } from '@app/modules/platform/services/followup.service';
import { followupRow, makeFollowupRepository } from './followup.fixtures';

function svcWith(rows: any[], now = Date.now()) {
    const cloudTasksClient = {
        enqueue: jest.fn(),
        deleteTask: jest.fn().mockResolvedValue(undefined),
    };
    const followupRepository = makeFollowupRepository(rows);
    const service = new FollowupService(
        cloudTasksClient as any,
        followupRepository as any,
        {} as any,
        {} as any,
        {} as any,
        {} as any,
        {} as any,
        {} as any,
        {} as any,
        {} as any
    );

    jest.spyOn(Date, 'now').mockReturnValue(now);

    return { service, cloudTasksClient, followupRepository };
}

describe('FollowupService.findAllByWorkspace', () => {
    const now = 1_000_000_000_000;

    const rows = () => [
        followupRow({
            id: 'f-1',
            reason: 'payment_check',
            triggerMessageId: 'm1',
            scheduledAt: new Date(now + 20 * 60_000),
        }),
        followupRow({
            id: 'f-2',
            chatbot: {
                id: 'cb-2',
                name: 'Other',
                avatar: null,
                workspace: 'ws-2',
            },
            conversation: { id: 'conv-2', senderName: 'Bob' },
            reason: 'x',
            scheduledAt: new Date(now + 5 * 60_000),
        }),
    ];

    afterEach(() => jest.restoreAllMocks());

    it('scopes to the workspace, and mapList enriches chatbot and senderName', async () => {
        const { service } = svcWith(rows(), now);

        const [followups, total] = await service.findAllByWorkspace('ws-1', {
            limit: 20,
            offset: 0,
        });

        expect(total).toBe(1);
        expect(service.mapList(followups)).toEqual([
            {
                followupId: 'f-1',
                chatbot: { id: 'cb-1', name: 'Beauty', avatar: null },
                conversationId: 'conv-1',
                senderName: 'Alice',
                triggerMessageId: 'm1',
                reason: 'payment_check',
                status: ENUM_FOLLOWUP_STATUS.SCHEDULED,
                scheduledAt: new Date(now + 20 * 60_000),
                firedAt: null,
                outcomeReason: null,
                firesInMinutes: 20,
            },
        ]);
    });

    it('filters by conversationId', async () => {
        const { service } = svcWith(rows(), now);

        const [followups] = await service.findAllByWorkspace('ws-1', {
            conversationId: 'conv-1',
            limit: 20,
            offset: 0,
        });

        expect(followups.map(followup => followup.id)).toEqual(['f-1']);
    });

    it('filters by chatbotId', async () => {
        const { service } = svcWith(
            [
                followupRow({ id: 'f-1' }),
                followupRow({
                    id: 'f-3',
                    chatbot: {
                        id: 'cb-3',
                        name: 'Spa',
                        avatar: null,
                        workspace: 'ws-1',
                    },
                }),
            ],
            now
        );

        const [followups] = await service.findAllByWorkspace('ws-1', {
            chatbotId: 'cb-3',
            limit: 20,
            offset: 0,
        });

        expect(followups.map(followup => followup.id)).toEqual(['f-3']);
    });

    it('filters by status so the page can show history only', async () => {
        const { service } = svcWith(
            [
                followupRow({ id: 'f-1' }),
                followupRow({
                    id: 'f-done',
                    status: ENUM_FOLLOWUP_STATUS.COMPLETED,
                    firedAt: new Date(now),
                }),
            ],
            now
        );

        const [followups, total] = await service.findAllByWorkspace('ws-1', {
            status: ENUM_FOLLOWUP_STATUS.COMPLETED,
            limit: 20,
            offset: 0,
        });

        expect(total).toBe(1);
        expect(service.mapList(followups)[0]).toEqual(
            expect.objectContaining({
                followupId: 'f-done',
                status: ENUM_FOLLOWUP_STATUS.COMPLETED,
                firedAt: new Date(now),
                firesInMinutes: 0,
            })
        );
    });

    it('excludes followups whose chatbot is soft-deleted', async () => {
        const { service } = svcWith(
            [
                followupRow({
                    id: 'f-1',
                    chatbot: {
                        id: 'cb-1',
                        name: 'Beauty',
                        avatar: null,
                        workspace: 'ws-1',
                        deletedAt: new Date(),
                    },
                }),
            ],
            now
        );

        await expect(
            service.findAllByWorkspace('ws-1', { limit: 20, offset: 0 })
        ).resolves.toEqual([[], 0]);
    });

    it('searches senderName case-insensitively', async () => {
        const { service } = svcWith(rows(), now);

        await expect(
            service.findAllByWorkspace('ws-1', {
                search: 'ali',
                limit: 20,
                offset: 0,
            })
        ).resolves.toEqual([expect.arrayContaining([]), 1]);
        await expect(
            service.findAllByWorkspace('ws-1', {
                search: 'zzz',
                limit: 20,
                offset: 0,
            })
        ).resolves.toEqual([[], 0]);
    });

    it('sorts by scheduledAt descending and paginates', async () => {
        const { service } = svcWith(
            [
                followupRow({
                    id: 'late',
                    scheduledAt: new Date(now + 40 * 60_000),
                }),
                followupRow({
                    id: 'soon',
                    scheduledAt: new Date(now + 10 * 60_000),
                }),
                followupRow({
                    id: 'mid',
                    scheduledAt: new Date(now + 25 * 60_000),
                }),
            ],
            now
        );

        const [followups, total] = await service.findAllByWorkspace('ws-1', {
            limit: 2,
            offset: 1,
        });

        expect(total).toBe(3);
        expect(followups.map(followup => followup.id)).toEqual(['mid', 'soon']);
    });
});

describe('FollowupService.cancelForWorkspace', () => {
    const now = 1_000_000_000_000;

    afterEach(() => jest.restoreAllMocks());

    it('cancels a followup whose chatbot is in the workspace', async () => {
        const rows = [followupRow({ id: 'f-1' })];
        const { service, cloudTasksClient } = svcWith(rows, now);

        await expect(
            service.cancelForWorkspace('ws-1', 'f-1')
        ).resolves.toEqual({ cancelled: true });
        expect(cloudTasksClient.deleteTask).toHaveBeenCalledWith(
            'followup',
            'followup-f-1'
        );
        expect(rows[0].status).toBe(ENUM_FOLLOWUP_STATUS.CANCELLED);
    });

    it('does not cancel a followup whose chatbot is in another workspace', async () => {
        const { service, cloudTasksClient } = svcWith(
            [
                followupRow({
                    id: 'f-1',
                    chatbot: {
                        id: 'cb-1',
                        name: 'Beauty',
                        avatar: null,
                        workspace: 'ws-other',
                    },
                }),
            ],
            now
        );

        await expect(
            service.cancelForWorkspace('ws-1', 'f-1')
        ).resolves.toEqual({ cancelled: false });
        expect(cloudTasksClient.deleteTask).not.toHaveBeenCalled();
    });

    it('returns cancelled false when the followup is gone', async () => {
        const { service, cloudTasksClient } = svcWith([], now);

        await expect(
            service.cancelForWorkspace('ws-1', 'missing')
        ).resolves.toEqual({ cancelled: false });
        expect(cloudTasksClient.deleteTask).not.toHaveBeenCalled();
    });
});
