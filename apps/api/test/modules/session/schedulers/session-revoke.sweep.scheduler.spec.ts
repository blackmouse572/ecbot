import { MikroORM } from '@mikro-orm/core';
import { SessionRevokeSweepScheduler } from '../../../../src/modules/session/schedulers/session-revoke.sweep.scheduler';

describe('SessionRevokeSweepScheduler', () => {
    const execute = jest.fn();
    const getReference = jest.fn((_e: unknown, id: string) => ({ id }));
    // `fork` is required by the `@ContextualCron` (CreateRequestContext) wrapper.
    const em = {
        name: 'default',
        getConnection: () => ({ execute }),
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

    beforeEach(() => {
        jest.clearAllMocks();
        execute.mockResolvedValue([]);
    });

    it('revokes expired ACTIVE sessions in a single UPDATE ... RETURNING', async () => {
        await build().sweep();

        expect(execute).toHaveBeenCalledTimes(1);
        const [sql, params] = execute.mock.calls[0];
        expect(sql).toMatch(/update sessions/i);
        expect(sql).toMatch(/returning id, user_id, impersonated_by/i);
        expect(params[0]).toBe('REVOKED');
        expect(params[2]).toBe('ACTIVE');
    });

    it('logs impersonate_end for exactly the impersonation sessions this run revoked', async () => {
        execute.mockResolvedValueOnce([
            { id: 's1', user_id: 'u1', impersonated_by: 'admin-1' },
            { id: 's2', user_id: 'u2', impersonated_by: null },
            { id: 's3', user_id: 'u3', impersonated_by: 'admin-3' },
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
        expect(createByAdmin).toHaveBeenNthCalledWith(
            2,
            { id: 'u3' },
            'admin-3',
            expect.anything()
        );
    });

    it('does not audit when the UPDATE changed nothing (another instance or a manual end got there first)', async () => {
        await build().sweep();

        expect(createByAdmin).not.toHaveBeenCalled();
    });

    it('keeps going when one audit write fails', async () => {
        execute.mockResolvedValueOnce([
            { id: 's1', user_id: 'u1', impersonated_by: 'admin-1' },
            { id: 's2', user_id: 'u2', impersonated_by: 'admin-2' },
        ]);
        createByAdmin.mockRejectedValueOnce(new Error('db down'));

        await expect(build().sweep()).resolves.toBeUndefined();

        expect(createByAdmin).toHaveBeenCalledTimes(2);
    });
});
