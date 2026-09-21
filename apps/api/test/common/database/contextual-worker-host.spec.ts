import { EntityManager, MikroORM, RequestContext } from '@mikro-orm/core';
import { Job } from 'bullmq';
import { ContextualWorkerHost } from '@app/common/database/bases/contextual-worker-host';

/**
 * Seam invariant: a processor extending ContextualWorkerHost runs its work
 * inside a fresh per-job EntityManager fork, so the global identity map never
 * accretes across jobs. This is the test that would have caught the original
 * OOM leak — a processor with no request context.
 */
function makeFakeOrm() {
    const forkedEm = {
        name: 'default',
        __forked: true,
    } as unknown as EntityManager;
    const globalEm = Object.assign(Object.create(EntityManager.prototype), {
        name: 'default',
        fork: jest.fn(() => forkedEm),
    }) as EntityManager;
    const orm = Object.assign(Object.create(MikroORM.prototype), {
        em: globalEm,
    }) as MikroORM;
    return { orm, globalEm, forkedEm };
}

class RecordingWorker extends ContextualWorkerHost {
    emInsideHandle: unknown;
    handledJob: Job | undefined;

    constructor(orm: MikroORM) {
        super(orm);
    }

    async handle(job: Job): Promise<unknown> {
        this.emInsideHandle = RequestContext.getEntityManager();
        this.handledJob = job;
        return `handled:${job.name}`;
    }
}

describe('ContextualWorkerHost', () => {
    const job = { name: 'INGEST', data: { x: 1 } } as unknown as Job;

    it('runs handle() inside a forked RequestContext (leak seam)', async () => {
        const { orm, globalEm, forkedEm } = makeFakeOrm();
        const worker = new RecordingWorker(orm);

        // no ambient context before the job
        expect(RequestContext.getEntityManager()).toBeUndefined();

        await worker.process(job);

        // a fresh fork was created for this job
        expect(globalEm.fork).toHaveBeenCalledWith(
            expect.objectContaining({ useContext: true })
        );
        // handle() saw the fork, never the shared global em
        expect(worker.emInsideHandle).toBe(forkedEm);
        expect(worker.emInsideHandle).not.toBe(globalEm);

        // context (and its identity map) is gone once the job settles
        expect(RequestContext.getEntityManager()).toBeUndefined();
    });

    it('delegates the job to handle() and returns its result', async () => {
        const { orm } = makeFakeOrm();
        const worker = new RecordingWorker(orm);

        const result = await worker.process(job);

        expect(worker.handledJob).toBe(job);
        expect(result).toBe('handled:INGEST');
    });

    it('throws at construction if a subclass overrides process() (final guard)', () => {
        class LeakyWorker extends ContextualWorkerHost {
            // Explicit public constructor: base constructor is protected.
            constructor(orm: MikroORM) {
                super(orm);
            }
            // Overriding process() would skip the fork seam — must be rejected.
            async process(): Promise<unknown> {
                return 'no context';
            }
            async handle(): Promise<unknown> {
                return null;
            }
        }
        const { orm } = makeFakeOrm();

        expect(() => new LeakyWorker(orm)).toThrow(/overrides process\(\)/);
    });
});
