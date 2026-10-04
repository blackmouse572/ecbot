import { MikroORM } from '@mikro-orm/core';
import { SessionRevokeSweepScheduler } from '../../../../src/modules/session/schedulers/session-revoke.sweep.scheduler';

describe('SessionRevokeSweepScheduler', () => {
    const nativeUpdate = jest.fn();
    const find = jest.fn(async () => []);
    const getReference = jest.fn((_e: unknown, id: string) => ({ id }));
    // `fork` is required by the `@ContextualCron` (CreateRequestContext) wrapper.
    const em = {
        name: 'default',
        nativeUpdate,
        find,
        getReference,
        fork: jest.fn(() => em),
    };
    const mockOrm = Object.assign(Object.create(MikroORM.prototype), { em });

    const createByAdmin = jest.fn(async () => undefined);
    const activityService = { createByAdmin };

    const build = () =>
        new SessionRevokeSweepScheduler(
            mockOrm as unknown as MikroORM,
            activityService as never
        );

    beforeEach(() => jest.clearAllMocks());

    it('revokes expired ACTIVE sessions (unchanged behaviour)', async () => {
        await build().sweep();
        const [entity, filter, update] = nativeUpdate.mock.calls[0];
        expect(entity.name).toBe('SessionEntity');
        expect(filter).toMatchObject({ status: 'ACTIVE' });
        expect(update).toMatchObject({ status: 'REVOKED' });
    });

    it('logs impersonate_end for each expired impersonation session', async () => {
        find.mockResolvedValueOnce([
            { id: 's1', user: { id: 'u1' }, impersonatedBy: 'admin-1' },
            { id: 's2', user: { id: 'u2' }, impersonatedBy: 'admin-2' },
        ]);

        await build().sweep();

        expect(createByAdmin).toHaveBeenCalledTimes(2);
        expect(createByAdmin).toHaveBeenNthCalledWith(
            1,
            { id: 'u1' },
            'admin-1',
            expect.objectContaining({
                action: 'impersonate_end',
                subject: 'USER',
                metadata: { session: 's1', reason: 'expired_swept' },
            })
        );
    });

    it('still bulk-revokes when an audit write fails', async () => {
        find.mockResolvedValueOnce([
            { id: 's1', user: { id: 'u1' }, impersonatedBy: 'admin-1' },
            { id: 's2', user: { id: 'u2' }, impersonatedBy: 'admin-2' },
        ]);
        createByAdmin.mockRejectedValueOnce(new Error('db down'));

        await expect(build().sweep()).resolves.toBeUndefined();

        expect(createByAdmin).toHaveBeenCalledTimes(2);
        expect(nativeUpdate).toHaveBeenCalledTimes(1);
    });

    it('does not throw when nothing matches', async () => {
        await expect(build().sweep()).resolves.toBeUndefined();
    });
});
