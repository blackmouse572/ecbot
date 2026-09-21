import { MikroORM } from '@mikro-orm/core';
import { SessionRevokeSweepScheduler } from '../../../../src/modules/session/schedulers/session-revoke.sweep.scheduler';

describe('SessionRevokeSweepScheduler', () => {
    const nativeUpdate = jest.fn();
    const mockEm = {
        name: 'default',
        fork: jest.fn(() => ({ name: 'default', nativeUpdate })),
        nativeUpdate,
    };
    const mockOrm = Object.assign(Object.create(MikroORM.prototype), {
        em: mockEm,
    });

    const build = () =>
        new SessionRevokeSweepScheduler(mockOrm as unknown as MikroORM);

    beforeEach(() => jest.clearAllMocks());

    describe('sweep', () => {
        it('nativeUpdates expired ACTIVE sessions to REVOKED with revokeAt', async () => {
            const scheduler = build();
            const before = Date.now();

            await scheduler.sweep();

            expect(nativeUpdate).toHaveBeenCalledTimes(1);
            const [entity, filter, update] = nativeUpdate.mock.calls[0];
            expect(entity.name).toBe('SessionEntity');
            expect(filter).toEqual({
                status: 'ACTIVE',
                expiredAt: { $lt: expect.any(Date) as Date },
            });
            const filterDate = (filter as any).expiredAt.$lt as Date;
            expect(filterDate.getTime()).toBeGreaterThanOrEqual(before);
            expect(update).toEqual({
                status: 'REVOKED',
                revokeAt: expect.any(Date),
            } as any);
        });

        it('does not throw when no sessions match', async () => {
            const scheduler = build();

            await expect(scheduler.sweep()).resolves.toBeUndefined();
            expect(nativeUpdate).toHaveBeenCalledTimes(1);
        });

        it('revokes multiple sessions in a single set-based operation', async () => {
            const scheduler = build();

            await scheduler.sweep();

            expect(nativeUpdate).toHaveBeenCalledTimes(1);
        });
    });
});
