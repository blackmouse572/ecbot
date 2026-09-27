import { BadRequestException } from '@nestjs/common';
import {
    ENUM_FOLLOWUP_PROCESS,
    ENUM_FOLLOWUP_STATUS,
} from '@app/modules/platform/constants/followup.constant';
import { IFollowupJob } from '@app/modules/platform/interfaces/followup.interface';
import { FollowupService } from '@app/modules/platform/services/followup.service';
import { followupRow, makeFollowupRepository } from './followup.fixtures';

const jobData: IFollowupJob = {
    conversationId: 'conv-1',
    chatbotId: 'cb-1',
    userId: 'psid-1',
    providerId: 'acc-1',
    customerId: 'cust-1',
    contactPointId: 'cp-1',
    prompt: 'check payment',
    reason: 'payment_check',
};

function buildService(rows: any[] = []) {
    const cloudTasksClient = {
        enqueue: jest.fn().mockResolvedValue(undefined),
        deleteTask: jest.fn().mockResolvedValue(undefined),
    };
    const followupRepository = makeFollowupRepository(rows);

    return {
        service: new FollowupService(
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
        ),
        cloudTasksClient,
        followupRepository,
    };
}

describe('FollowupService', () => {
    afterEach(() => jest.restoreAllMocks());

    it('schedule() persists a SCHEDULED row and enqueues a Cloud Task carrying its id', async () => {
        const { service, cloudTasksClient, followupRepository } =
            buildService();

        const id = await service.schedule(jobData, 30);

        expect(followupRepository.rows).toEqual([
            expect.objectContaining({
                id,
                prompt: 'check payment',
                reason: 'payment_check',
                status: ENUM_FOLLOWUP_STATUS.SCHEDULED,
            }),
        ]);
        expect(cloudTasksClient.enqueue).toHaveBeenCalledWith(
            'followup',
            ENUM_FOLLOWUP_PROCESS.FIRE,
            { ...jobData, followupId: id },
            {
                taskName: `followup-${id}`,
                scheduleTime: expect.any(Date),
            }
        );
    });

    it('schedule() preserves triggerMessageId on both the row and the payload', async () => {
        const { service, cloudTasksClient, followupRepository } =
            buildService();

        await service.schedule({ ...jobData, triggerMessageId: 'msg-9' }, 30);

        expect(followupRepository.rows[0].triggerMessageId).toBe('msg-9');
        expect(cloudTasksClient.enqueue).toHaveBeenCalledWith(
            'followup',
            ENUM_FOLLOWUP_PROCESS.FIRE,
            expect.objectContaining({ triggerMessageId: 'msg-9' }),
            expect.anything()
        );
    });

    it('schedule() drops the row when the enqueue fails so nothing shows as pending', async () => {
        const { service, cloudTasksClient, followupRepository } =
            buildService();
        const error = new Error('cloud tasks down');
        cloudTasksClient.enqueue.mockRejectedValue(error);

        await expect(service.schedule(jobData, 30)).rejects.toBe(error);
        expect(followupRepository.rows).toEqual([]);
    });

    it('schedule() rejects with a 400 once the conversation already has 5 pending follow-ups', async () => {
        const rows = Array.from({ length: 5 }, (_, i) =>
            followupRow({ id: `f-${i}` })
        );
        const { service, cloudTasksClient, followupRepository } =
            buildService(rows);

        const promise = service.schedule(jobData, 30);

        await expect(promise).rejects.toBeInstanceOf(BadRequestException);
        await expect(promise).rejects.toThrow(
            'followup.schedule.error.tooManyPending'
        );
        expect(cloudTasksClient.enqueue).not.toHaveBeenCalled();
        expect(followupRepository.rows).toHaveLength(5);
    });

    it('schedule() still allows scheduling with 4 pending follow-ups (below the cap)', async () => {
        const rows = Array.from({ length: 4 }, (_, i) =>
            followupRow({ id: `f-${i}` })
        );
        const { service, cloudTasksClient } = buildService(rows);

        await expect(service.schedule(jobData, 30)).resolves.toEqual(
            expect.any(String)
        );
        expect(cloudTasksClient.enqueue).toHaveBeenCalled();
    });

    it('schedule() counts FAILED follow-ups (still pending retry) toward the cap', async () => {
        const rows = [
            ...Array.from({ length: 4 }, (_, i) =>
                followupRow({ id: `f-${i}` })
            ),
            followupRow({
                id: 'f-failed',
                status: ENUM_FOLLOWUP_STATUS.FAILED,
            }),
        ];
        const { service, cloudTasksClient } = buildService(rows);

        await expect(service.schedule(jobData, 30)).rejects.toBeInstanceOf(
            BadRequestException
        );
        expect(cloudTasksClient.enqueue).not.toHaveBeenCalled();
    });

    it("schedule() ignores another conversation's pending follow-ups when counting the cap", async () => {
        const rows = Array.from({ length: 5 }, (_, i) =>
            followupRow({
                id: `f-${i}`,
                conversation: { id: 'other-conv', senderName: 'Bob' },
            })
        );
        const { service, cloudTasksClient } = buildService(rows);

        await expect(service.schedule(jobData, 30)).resolves.toEqual(
            expect.any(String)
        );
        expect(cloudTasksClient.enqueue).toHaveBeenCalled();
    });

    it('cancel() deletes the Cloud Task and records CANCELLED', async () => {
        const rows = [followupRow({ id: 'f-1' })];
        const { service, cloudTasksClient } = buildService(rows);

        expect(await service.cancel('f-1', 'conv-1')).toBe(true);
        expect(cloudTasksClient.deleteTask).toHaveBeenCalledWith(
            'followup',
            'followup-f-1'
        );
        expect(rows[0].status).toBe(ENUM_FOLLOWUP_STATUS.CANCELLED);
        expect(rows[0].cancelledAt).toBeInstanceOf(Date);
    });

    it('cancel() returns false when no followup exists', async () => {
        const { service, cloudTasksClient } = buildService([
            followupRow({ id: 'other' }),
        ]);

        expect(await service.cancel('f-1', 'conv-1')).toBe(false);
        expect(cloudTasksClient.deleteTask).not.toHaveBeenCalled();
    });

    it('cancel() returns false once the followup has already fired', async () => {
        const { service, cloudTasksClient } = buildService([
            followupRow({
                id: 'f-1',
                status: ENUM_FOLLOWUP_STATUS.COMPLETED,
            }),
        ]);

        expect(await service.cancel('f-1', 'conv-1')).toBe(false);
        expect(cloudTasksClient.deleteTask).not.toHaveBeenCalled();
    });

    it('cancel() still works while a failed followup is awaiting retry', async () => {
        const rows = [
            followupRow({ id: 'f-1', status: ENUM_FOLLOWUP_STATUS.FAILED }),
        ];
        const { service, cloudTasksClient } = buildService(rows);

        expect(await service.cancel('f-1', 'conv-1')).toBe(true);
        expect(cloudTasksClient.deleteTask).toHaveBeenCalledWith(
            'followup',
            'followup-f-1'
        );
        expect(rows[0].status).toBe(ENUM_FOLLOWUP_STATUS.CANCELLED);
    });

    it('cancel() treats a delete race as a successful cancellation', async () => {
        const { service, cloudTasksClient } = buildService([
            followupRow({ id: 'f-1' }),
        ]);
        cloudTasksClient.deleteTask.mockRejectedValue(
            Object.assign(new Error('task disappeared'), { code: 5 })
        );

        expect(await service.cancel('f-1', 'conv-1')).toBe(true);
    });

    it('cancel() returns false when the followup belongs to a different conversation', async () => {
        const { service, cloudTasksClient } = buildService([
            followupRow({ id: 'f-1', conversation: { id: 'conv-1' } }),
        ]);

        expect(await service.cancel('f-1', 'other-conv')).toBe(false);
        expect(cloudTasksClient.deleteTask).not.toHaveBeenCalled();
    });

    it('findScheduledByConversation() + mapPending() return only pending followups with remaining minutes', async () => {
        const now = 1_000_000_000_000;
        jest.spyOn(Date, 'now').mockReturnValue(now);
        const { service } = buildService([
            followupRow({
                id: 'f-1',
                reason: 'payment_check',
                scheduledAt: new Date(now + 20 * 60_000),
            }),
            followupRow({
                id: 'f-done',
                status: ENUM_FOLLOWUP_STATUS.COMPLETED,
                scheduledAt: new Date(now + 5 * 60_000),
            }),
            followupRow({
                id: 'f-2',
                conversation: { id: 'other', senderName: 'Bob' },
                scheduledAt: new Date(now + 60_000),
            }),
        ]);

        const followups = await service.findScheduledByConversation('conv-1');

        expect(service.mapPending(followups)).toEqual([
            { followupId: 'f-1', reason: 'payment_check', firesInMinutes: 20 },
        ]);
    });

    it('keeps the image a follow-up sends on the persisted message', async () => {
        const insertPendingOutbound = jest.fn().mockResolvedValue(undefined);
        const account = {
            id: 'acc-1',
            type: 'telegram',
            chatbot: { id: 'cb-1', workspace: { id: 'ws-1' } },
        };
        const image = [{ type: 'image', url: 'https://kb/shirt.jpg' }];
        const history = [{ role: 'user', content: '[image: A white shirt]' }];
        const streamChat = jest.fn().mockResolvedValue({});
        const turnContext = { build: jest.fn().mockResolvedValue({ history }) };
        const service = new FollowupService(
            {} as any,
            makeFollowupRepository([]) as any,
            { findOne: jest.fn().mockResolvedValue(account) } as any,
            { streamChat } as any,
            { insertPendingOutbound } as any,
            { get: jest.fn().mockReturnValue({}) } as any,
            { build: jest.fn().mockResolvedValue([]) } as any,
            {
                deliver: jest.fn(async (p: any) => {
                    await p.onSegmentPersist('', image);
                    return {};
                }),
            } as any,
            {} as any,
            turnContext as any
        );
        jest.spyOn(service as any, 'recordOutcome').mockResolvedValue(
            undefined
        );

        await (service as any).generateAndDeliver(null, jobData);

        // A follow-up answers no burst: all recent rows are its history.
        expect(turnContext.build).toHaveBeenCalledWith(
            'conv-1',
            { texts: [] },
            'cb-1'
        );
        expect(streamChat.mock.calls[0][0].history).toBe(history);

        expect(insertPendingOutbound).toHaveBeenCalledWith(
            'conv-1',
            expect.any(String),
            expect.objectContaining({ attachments: image })
        );
    });
});
