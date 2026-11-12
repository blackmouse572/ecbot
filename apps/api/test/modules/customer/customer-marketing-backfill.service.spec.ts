import { UniqueConstraintViolationException } from '@mikro-orm/core';
import { ENUM_CUSTOMER_MARKETING_BACKFILL_PROCESS } from '../../../src/modules/customer/constants/customer-marketing-backfill.constant';
import { ENUM_MARKETING_BACKFILL_STATUS } from '../../../src/modules/customer/enums/customer-marketing.enum';
import { CustomerMarketingBackfillService } from '../../../src/modules/customer/services/customer-marketing-backfill.service';

const DAY_MS = 86_400_000;

describe('CustomerMarketingBackfillService (#500)', () => {
    const em = { getReference: jest.fn((_e: unknown, id: string) => ({ id })) };
    const runRepository = {
        findOne: jest.fn(),
        findOneById: jest.fn(),
        save: jest.fn(async (run: unknown) => run),
        getEntityManager: () => em,
    };
    const conversationRepository = {
        countForMarketingBackfill: jest.fn(),
        findForMarketingBackfill: jest.fn(),
    };
    const classifier = { classifyMarketing: jest.fn() };
    const cloudTasks = { enqueue: jest.fn() };
    const meter = { check: jest.fn(), record: jest.fn() };

    const make = (withMeter = true) =>
        new CustomerMarketingBackfillService(
            runRepository as any,
            conversationRepository as any,
            classifier as any,
            cloudTasks as any,
            withMeter ? (meter as any) : undefined
        );

    const conversations = (n: number, from = 0) =>
        Array.from({ length: n }, (_, i) => ({
            id: `conv-${from + i}`,
            lastMessageAt: new Date(Date.now() - (from + i) * 60_000),
        }));

    const runningRun = (overrides: Record<string, unknown> = {}) => ({
        id: 'run-1',
        workspace: { id: 'ws-1' },
        status: ENUM_MARKETING_BACKFILL_STATUS.RUNNING,
        since: new Date(Date.now() - 90 * DAY_MS),
        total: 100,
        processed: 0,
        processedAtStart: 0,
        budgetStart: 1_000_000,
        budgetFloor: 700_000,
        cursorAt: null,
        cursorId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        ...overrides,
    });

    beforeEach(() => {
        jest.clearAllMocks();
        classifier.classifyMarketing.mockResolvedValue(undefined);
        cloudTasks.enqueue.mockResolvedValue(undefined);
        meter.check.mockResolvedValue({ allowed: true, remaining: 1_000_000 });
    });

    describe('start', () => {
        it('reads the last 90 days and may spend 30% of the tokens left', async () => {
            runRepository.findOne.mockResolvedValue(null);
            conversationRepository.countForMarketingBackfill.mockResolvedValue(
                10_000
            );

            const run: any = await make().start('ws-1', 'user-1');

            expect(run.status).toBe(ENUM_MARKETING_BACKFILL_STATUS.RUNNING);
            expect(run.total).toBe(10_000);
            expect(run.budgetStart).toBe(1_000_000);
            expect(run.budgetFloor).toBe(700_000);
            expect(Date.now() - run.since.getTime()).toBeGreaterThanOrEqual(
                90 * DAY_MS - 1000
            );
            // The tokens left of the workspace, not of one chatbot.
            expect(meter.check).toHaveBeenCalledWith('ws-1');
            expect(cloudTasks.enqueue).toHaveBeenCalledWith(
                'customer-marketing-backfill',
                ENUM_CUSTOMER_MARKETING_BACKFILL_PROCESS.BATCH,
                { runId: run.id },
                expect.objectContaining({ taskName: expect.any(String) })
            );
        });

        it('returns a running or finished run as it is', async () => {
            for (const status of [
                ENUM_MARKETING_BACKFILL_STATUS.RUNNING,
                ENUM_MARKETING_BACKFILL_STATUS.DONE,
            ]) {
                const run = runningRun({ status });
                runRepository.findOne.mockResolvedValue(run);

                await expect(make().start('ws-1', 'user-1')).resolves.toBe(run);
            }
            expect(cloudTasks.enqueue).not.toHaveBeenCalled();
            expect(runRepository.save).not.toHaveBeenCalled();
        });

        it('resumes a run stopped at its cap from where it stopped, with a new cap', async () => {
            const run = runningRun({
                status: ENUM_MARKETING_BACKFILL_STATUS.STOPPED_BUDGET,
                processed: 400,
                cursorId: 'conv-399',
            });
            runRepository.findOne.mockResolvedValue(run);
            meter.check.mockResolvedValue({
                allowed: true,
                remaining: 500_000,
            });

            await make().start('ws-1', 'user-1');

            expect(run).toMatchObject({
                status: ENUM_MARKETING_BACKFILL_STATUS.RUNNING,
                processed: 400,
                processedAtStart: 400,
                cursorId: 'conv-399',
                budgetStart: 500_000,
                budgetFloor: 350_000,
            });
            expect(
                conversationRepository.countForMarketingBackfill
            ).not.toHaveBeenCalled();
            expect(cloudTasks.enqueue).toHaveBeenCalledTimes(1);
        });

        it('re-queues a run whose task chain stalled', async () => {
            const run = runningRun({
                updatedAt: new Date(Date.now() - 60 * 60 * 1000),
            });
            runRepository.findOne.mockResolvedValue(run);

            await make().start('ws-1', 'user-1');

            expect(cloudTasks.enqueue).toHaveBeenCalledTimes(1);
        });

        it('returns the run a concurrent start created instead of failing', async () => {
            const other = runningRun();
            runRepository.findOne
                .mockResolvedValueOnce(null)
                .mockResolvedValueOnce(other);
            conversationRepository.countForMarketingBackfill.mockResolvedValue(
                5
            );
            runRepository.save.mockRejectedValueOnce(
                new UniqueConstraintViolationException(new Error('dup'))
            );

            await expect(make().start('ws-1', 'user-1')).resolves.toBe(other);
            expect(cloudTasks.enqueue).not.toHaveBeenCalled();
        });

        it('has no cap in the open edition (no meter)', async () => {
            runRepository.findOne.mockResolvedValue(null);
            conversationRepository.countForMarketingBackfill.mockResolvedValue(
                5
            );

            const run: any = await make(false).start('ws-1', 'user-1');

            expect(run.budgetStart).toBeNull();
            expect(run.budgetFloor).toBeNull();
        });
    });

    describe('runBatch', () => {
        it('classifies a full batch from the cursor, moves it on and queues the next', async () => {
            const cursorAt = new Date();
            const run = runningRun({
                processed: 25,
                processedAtStart: 0,
                cursorAt,
                cursorId: 'conv-24',
                budgetStart: 1_000_000,
                // 25 conversations cost 25,000: 1,000 each, so the next
                // batch fits above the floor.
            });
            meter.check.mockResolvedValue({
                allowed: true,
                remaining: 975_000,
            });
            runRepository.findOneById.mockResolvedValue(run);
            const batch = conversations(25, 25);
            conversationRepository.findForMarketingBackfill.mockResolvedValue(
                batch
            );

            await make().runBatch('run-1');

            expect(
                conversationRepository.findForMarketingBackfill
            ).toHaveBeenCalledWith(
                'ws-1',
                run.since,
                { at: cursorAt, id: 'conv-24' },
                25
            );
            expect(classifier.classifyMarketing).toHaveBeenCalledTimes(25);
            expect(classifier.classifyMarketing).toHaveBeenCalledWith(
                'conv-25',
                run.since
            );
            expect(run).toMatchObject({
                processed: 50,
                cursorId: 'conv-49',
                cursorAt: batch[24].lastMessageAt,
                status: ENUM_MARKETING_BACKFILL_STATUS.RUNNING,
            });
            expect(cloudTasks.enqueue).toHaveBeenCalledTimes(1);
        });

        it('finishes on a short batch', async () => {
            const run = runningRun();
            runRepository.findOneById.mockResolvedValue(run);
            conversationRepository.findForMarketingBackfill.mockResolvedValue(
                conversations(3)
            );

            await make().runBatch('run-1');

            expect(run.status).toBe(ENUM_MARKETING_BACKFILL_STATUS.DONE);
            expect((run as any).finishedAt).toBeInstanceOf(Date);
            expect(run.processed).toBe(3);
            expect(cloudTasks.enqueue).not.toHaveBeenCalled();
        });

        it('stops before a batch that would go past 30% of the tokens left', async () => {
            // 100 conversations cost 250,000: 2,500 each, so 25 more would
            // take 750,000 left to 687,500, under the 700,000 floor.
            const run = runningRun({ processed: 100 });
            runRepository.findOneById.mockResolvedValue(run);
            meter.check.mockResolvedValue({
                allowed: true,
                remaining: 750_000,
            });

            await make().runBatch('run-1');

            expect(run.status).toBe(
                ENUM_MARKETING_BACKFILL_STATUS.STOPPED_BUDGET
            );
            expect(classifier.classifyMarketing).not.toHaveBeenCalled();
            expect(cloudTasks.enqueue).not.toHaveBeenCalled();
        });

        it('assumes a high cost per conversation before it has measured one', async () => {
            // 8,000 x 25 = 200,000 from 850,000 is under the 700,000 floor.
            const run = runningRun();
            runRepository.findOneById.mockResolvedValue(run);
            meter.check.mockResolvedValue({
                allowed: true,
                remaining: 850_000,
            });

            await make().runBatch('run-1');

            expect(run.status).toBe(
                ENUM_MARKETING_BACKFILL_STATUS.STOPPED_BUDGET
            );
        });

        it('stops when the meter blocks the workspace', async () => {
            const run = runningRun();
            runRepository.findOneById.mockResolvedValue(run);
            meter.check.mockResolvedValue({ allowed: false, reason: 'quota' });

            await make().runBatch('run-1');

            expect(run.status).toBe(
                ENUM_MARKETING_BACKFILL_STATUS.STOPPED_BUDGET
            );
        });

        it('skips a conversation that fails and carries on', async () => {
            const run = runningRun({ budgetStart: null, budgetFloor: null });
            runRepository.findOneById.mockResolvedValue(run);
            conversationRepository.findForMarketingBackfill.mockResolvedValue(
                conversations(2)
            );
            classifier.classifyMarketing.mockRejectedValueOnce(
                new Error('AI down')
            );

            await make().runBatch('run-1');

            expect(classifier.classifyMarketing).toHaveBeenCalledTimes(2);
            expect(run.processed).toBe(2);
            expect(run.status).toBe(ENUM_MARKETING_BACKFILL_STATUS.DONE);
        });

        it('does nothing for a run that is not running', async () => {
            runRepository.findOneById.mockResolvedValue(
                runningRun({ status: ENUM_MARKETING_BACKFILL_STATUS.DONE })
            );

            await make().runBatch('run-1');

            expect(
                conversationRepository.findForMarketingBackfill
            ).not.toHaveBeenCalled();
        });
    });

    it('reports a running run with no progress for 15 minutes as stalled', () => {
        // Cloud Tasks drops a batch after its last attempt and the chain
        // ends, so the owner must see it and start it again to resume.
        const stalled = runningRun({
            updatedAt: new Date(Date.now() - 16 * 60 * 1000),
        });
        expect(make().mapGet(stalled as any).stalled).toBe(true);
        expect(make().mapGet(runningRun() as any).stalled).toBe(false);
        expect(
            make().mapGet(
                runningRun({
                    status: ENUM_MARKETING_BACKFILL_STATUS.DONE,
                    updatedAt: new Date(0),
                }) as any
            ).stalled
        ).toBe(false);
    });

    it('reports a workspace that never started as NOT_STARTED', () => {
        expect(make().mapGet(null)).toEqual({
            status: ENUM_MARKETING_BACKFILL_STATUS.NOT_STARTED,
        });
    });
});
