import 'reflect-metadata';
import { EntityManager, MikroORM, RequestContext } from '@mikro-orm/core';
import { ContextualCron } from '@app/common/database/decorators/contextual-cron.decorator';

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
    return { orm, forkedEm };
}

class SampleScheduler {
    emInsideCron: unknown;

    constructor(private readonly orm: MikroORM) {}

    @ContextualCron('*/5 * * * * *')
    async tick(): Promise<void> {
        this.emInsideCron = RequestContext.getEntityManager();
    }
}

describe('ContextualCron', () => {
    it('keeps @Cron scheduling metadata after composition (order is load-bearing)', () => {
        // Cron sets SCHEDULE_CRON_OPTIONS on descriptor.value. If CreateRequestContext
        // ran AFTER Cron, the metadata would land on the unwrapped fn and vanish.
        const meta = Reflect.getMetadata(
            'SCHEDULE_CRON_OPTIONS',
            SampleScheduler.prototype.tick
        );
        expect(meta).toBeDefined();
        expect(meta.cronTime).toBe('*/5 * * * * *');
    });

    it('runs the cron body inside a forked RequestContext', async () => {
        const { orm, forkedEm } = makeFakeOrm();
        const scheduler = new SampleScheduler(orm);

        expect(RequestContext.getEntityManager()).toBeUndefined();

        await scheduler.tick();

        expect(scheduler.emInsideCron).toBe(forkedEm);
        expect(RequestContext.getEntityManager()).toBeUndefined();
    });
});
