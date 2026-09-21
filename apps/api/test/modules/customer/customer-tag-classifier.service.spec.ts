import { ENUM_CONVERSATION_STATUS } from '../../../src/modules/conversation/enums/conversation.enum';
import {
    CUSTOMER_TAG_CLASSIFIER_DEBOUNCE_MS,
    CUSTOMER_TAG_CLASSIFIER_QUEUE,
    ENUM_CUSTOMER_TAG_CLASSIFIER_PROCESS,
} from '../../../src/modules/customer/constants/customer-tag-classifier.constant';
import { CustomerTagClassifierService } from '../../../src/modules/customer/services/customer-tag-classifier.service';

describe('CustomerTagClassifierService (#170 — debounced scheduling)', () => {
    let service: CustomerTagClassifierService;

    const queue = {
        listTasks: jest.fn(),
        deleteTask: jest.fn(),
        enqueue: jest.fn(),
    };
    const conversationRepository = {
        findOneById: jest.fn(),
    };

    beforeEach(() => {
        jest.clearAllMocks();
        queue.listTasks.mockResolvedValue([]);
        queue.deleteTask.mockResolvedValue(undefined);
        queue.enqueue.mockResolvedValue(undefined);
        service = new CustomerTagClassifierService(
            queue as any,
            conversationRepository as any
        );
    });

    describe('scheduleAfterMessage', () => {
        it('enqueues a delayed CLASSIFY task with a nonce name and snapshotKey', async () => {
            const lastMessageAt = new Date('2026-06-15T12:00:00Z');
            conversationRepository.findOneById.mockResolvedValue({
                id: 'conv-1',
                lastMessageAt,
                status: ENUM_CONVERSATION_STATUS.OPEN,
            });

            await service.scheduleAfterMessage('conv-1', lastMessageAt);

            expect(queue.enqueue).toHaveBeenCalledWith(
                CUSTOMER_TAG_CLASSIFIER_QUEUE,
                ENUM_CUSTOMER_TAG_CLASSIFIER_PROCESS.CLASSIFY,
                {
                    conversationId: 'conv-1',
                    snapshotKey: `${lastMessageAt.toISOString()}:${ENUM_CONVERSATION_STATUS.OPEN}`,
                },
                {
                    taskName: expect.stringMatching(/^classify-conv-1-/),
                    scheduleTime: expect.any(Date),
                }
            );
            const scheduleTime = queue.enqueue.mock.calls[0][3].scheduleTime;
            expect(scheduleTime.getTime()).toBeGreaterThanOrEqual(
                Date.now() + CUSTOMER_TAG_CLASSIFIER_DEBOUNCE_MS - 1000
            );
        });

        it('generates unique UUID-shaped task names across schedules', async () => {
            const lastMessageAt = new Date('2026-06-15T12:00:00Z');
            conversationRepository.findOneById.mockResolvedValue({
                id: 'conv-1',
                lastMessageAt,
                status: ENUM_CONVERSATION_STATUS.OPEN,
            });

            await service.scheduleAfterMessage('conv-1', lastMessageAt);
            await service.scheduleAfterMessage('conv-1', lastMessageAt);

            const taskNames = queue.enqueue.mock.calls.map(
                ([, , , options]) => options.taskName
            );
            expect(taskNames[0]).toMatch(
                /^classify-conv-1-[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
            );
            expect(taskNames[1]).toMatch(
                /^classify-conv-1-[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
            );
            expect(taskNames[1]).not.toBe(taskNames[0]);
        });

        it('reads the snapshot from the conversation entity at scheduling time (not from the caller)', async () => {
            // Caller-supplied lastMessageAt is intentionally STALE — the service
            // should still record the snapshot from the live entity.
            const callerStale = new Date('2026-06-15T09:00:00Z');
            const liveLatest = new Date('2026-06-15T12:30:00Z');
            conversationRepository.findOneById.mockResolvedValue({
                id: 'conv-1',
                lastMessageAt: liveLatest,
                status: ENUM_CONVERSATION_STATUS.OPEN,
            });

            await service.scheduleAfterMessage('conv-1', callerStale);

            const payload = queue.enqueue.mock.calls[0][2];
            expect(payload.snapshotKey).toContain(liveLatest.toISOString());
            expect(payload.snapshotKey).not.toContain(
                callerStale.toISOString()
            );
        });

        it('deletes every matching pending task before scheduling a newer snapshot', async () => {
            const firstAt = new Date('2026-06-15T12:00:00Z');
            const laterAt = new Date('2026-06-15T12:30:00Z');

            conversationRepository.findOneById.mockResolvedValueOnce({
                id: 'conv-1',
                lastMessageAt: firstAt,
                status: ENUM_CONVERSATION_STATUS.OPEN,
            });
            await service.scheduleAfterMessage('conv-1', firstAt);

            queue.listTasks.mockResolvedValueOnce([
                null,
                { payload: null, taskName: 'malformed' },
                {
                    taskName: 'classify-conv-1-old',
                    payload: {
                        jobName: ENUM_CUSTOMER_TAG_CLASSIFIER_PROCESS.CLASSIFY,
                        conversationId: 'conv-1',
                        snapshotKey: 'stale',
                    },
                },
                {
                    taskName: 'classify-conv-2',
                    payload: {
                        jobName: ENUM_CUSTOMER_TAG_CLASSIFIER_PROCESS.CLASSIFY,
                        conversationId: 'conv-2',
                    },
                },
                {
                    taskName: 'other-conv-1',
                    payload: {
                        jobName: 'other',
                        conversationId: 'conv-1',
                    },
                },
            ]);
            conversationRepository.findOneById.mockResolvedValueOnce({
                id: 'conv-1',
                lastMessageAt: laterAt,
                status: ENUM_CONVERSATION_STATUS.OPEN,
            });

            await service.scheduleAfterMessage('conv-1', laterAt);

            expect(queue.deleteTask).toHaveBeenCalledTimes(1);
            expect(queue.deleteTask).toHaveBeenCalledWith(
                CUSTOMER_TAG_CLASSIFIER_QUEUE,
                'classify-conv-1-old'
            );
            expect(queue.enqueue).toHaveBeenCalledTimes(2);
            expect(queue.enqueue.mock.calls[1][2].snapshotKey).toBe(
                `${laterAt.toISOString()}:${ENUM_CONVERSATION_STATUS.OPEN}`
            );
        });

        it('skips silently when the conversation is gone (no add, no remove)', async () => {
            conversationRepository.findOneById.mockResolvedValue(null);

            await service.scheduleAfterMessage('conv-ghost', new Date());

            expect(queue.enqueue).not.toHaveBeenCalled();
            expect(queue.listTasks).not.toHaveBeenCalled();
        });
    });

    describe('scheduleOnResolved', () => {
        it('enqueues an immediate CLASSIFY task whose snapshotKey reflects RESOLVED', async () => {
            const lastMessageAt = new Date('2026-06-15T12:00:00Z');
            conversationRepository.findOneById.mockResolvedValue({
                id: 'conv-1',
                lastMessageAt,
                status: ENUM_CONVERSATION_STATUS.RESOLVED,
            });

            await service.scheduleOnResolved('conv-1');

            expect(queue.enqueue).toHaveBeenCalledTimes(1);
            const [queueName, jobName, payload, opts] =
                queue.enqueue.mock.calls[0];
            expect(queueName).toBe(CUSTOMER_TAG_CLASSIFIER_QUEUE);
            expect(jobName).toBe(ENUM_CUSTOMER_TAG_CLASSIFIER_PROCESS.CLASSIFY);
            expect(opts.taskName).toEqual(
                expect.stringMatching(/^classify-conv-1-/)
            );
            expect(opts.scheduleTime).toBeInstanceOf(Date);
            expect(opts.scheduleTime.getTime()).toBeLessThanOrEqual(Date.now());
            expect(payload.snapshotKey).toBe(
                `${lastMessageAt.toISOString()}:${ENUM_CONVERSATION_STATUS.RESOLVED}`
            );
        });

        it('reads snapshot from the conversation entity and removes a pending debounced task', async () => {
            queue.listTasks.mockResolvedValue([
                {
                    taskName: 'classify-conv-1-pending',
                    payload: {
                        jobName: ENUM_CUSTOMER_TAG_CLASSIFIER_PROCESS.CLASSIFY,
                        conversationId: 'conv-1',
                    },
                },
            ]);
            const lastMessageAt = new Date('2026-06-15T13:00:00Z');
            conversationRepository.findOneById.mockResolvedValue({
                id: 'conv-1',
                lastMessageAt,
                status: ENUM_CONVERSATION_STATUS.RESOLVED,
            });

            await service.scheduleOnResolved('conv-1');

            // Read happened against the repo (not the caller).
            expect(conversationRepository.findOneById).toHaveBeenCalledWith(
                'conv-1'
            );
            // Pending job replaced.
            expect(queue.deleteTask).toHaveBeenCalledWith(
                CUSTOMER_TAG_CLASSIFIER_QUEUE,
                'classify-conv-1-pending'
            );
            expect(queue.enqueue).toHaveBeenCalledTimes(1);
        });

        it('skips silently when the conversation is gone', async () => {
            conversationRepository.findOneById.mockResolvedValue(null);

            await service.scheduleOnResolved('conv-ghost');

            expect(queue.enqueue).not.toHaveBeenCalled();
        });
    });
});
