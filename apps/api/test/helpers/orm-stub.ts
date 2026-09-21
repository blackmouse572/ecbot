import { MikroORM } from '@mikro-orm/core';

/**
 * Minimal object that is `instanceof MikroORM` and exposes a forkable `em`, so
 * ContextualWorkerHost's `@CreateRequestContext` resolves and forks without a
 * real database. Used by processor specs to drive `process()` through the real
 * context seam.
 */
export const ormStub = (): MikroORM =>
    Object.assign(Object.create(MikroORM.prototype), {
        em: { name: 'default', fork: () => ({ name: 'default' }) },
    }) as unknown as MikroORM;
