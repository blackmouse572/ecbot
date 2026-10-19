import { HttpException, HttpStatus } from '@nestjs/common';
import { AxiosError } from 'axios';
import { ENUM_CHANNEL_ALERT } from '@app/modules/platform/constants/channel-health.constant';
import { ChannelDeliveryService } from '@app/modules/platform/services/channel-delivery.service';

const upstream = (status: number, platformError: unknown = {}) =>
    new HttpException(
        { upstreamStatus: status, platformError, message: 'x' },
        HttpStatus.BAD_GATEWAY
    );

function makeService() {
    const counts = new Map<string, number>();
    const rateLimit = {
        claim: jest.fn(async (key: string, limit: number) => {
            const next = (counts.get(key) ?? 0) + 1;
            counts.set(key, next);
            return next <= limit;
        }),
        reset: jest.fn(async (key: string) => {
            counts.delete(key);
        }),
    };
    const alerts = {
        open: jest.fn(async () => undefined),
        recovered: jest.fn(async () => undefined),
    };
    const service = new ChannelDeliveryService(
        [],
        rateLimit as any,
        alerts as any
    );
    const sleeps: number[] = [];
    (service as any).sleep = async (ms: number) => {
        sleeps.push(ms);
    };
    return { service, rateLimit, alerts, sleeps };
}

const account = () => ({ id: 'acc-1' }) as any;

describe('ChannelDeliveryService.run', () => {
    it('resends a transient failure twice, then succeeds without alerting', async () => {
        const { service, alerts, sleeps } = makeService();
        const send = jest
            .fn()
            .mockRejectedValueOnce(upstream(503))
            .mockRejectedValueOnce(new AxiosError('x', 'ECONNREFUSED'))
            .mockResolvedValue({ externalId: 'm1' });

        await expect(service.run(account(), send)).resolves.toEqual({
            externalId: 'm1',
        });
        expect(send).toHaveBeenCalledTimes(3);
        expect(sleeps).toEqual([2000, 10000]);
        expect(alerts.open).not.toHaveBeenCalled();
    });

    it('never resends a timeout, which the platform may have delivered', async () => {
        const { service, sleeps } = makeService();
        const send = jest
            .fn()
            .mockRejectedValue(new AxiosError('x', 'ECONNABORTED'));

        await expect(service.run(account(), send)).rejects.toBeDefined();
        expect(send).toHaveBeenCalledTimes(1);
        expect(sleeps).toEqual([]);
    });

    it('alerts at once on an auth failure, without resending', async () => {
        const { service, alerts } = makeService();
        const acc = account();
        const send = jest
            .fn()
            .mockRejectedValue(upstream(400, { error: { code: 190 } }));

        await expect(service.run(acc, send)).rejects.toBeDefined();
        expect(send).toHaveBeenCalledTimes(1);
        expect(alerts.open).toHaveBeenCalledWith(
            acc,
            ENUM_CHANNEL_ALERT.AUTH_FAILED,
            expect.anything()
        );
    });

    it('opens a send-failing alert on the third failure in a row', async () => {
        const { service, alerts } = makeService();
        const send = jest.fn().mockRejectedValue(upstream(400));

        for (let i = 0; i < 2; i++) {
            await expect(service.run(account(), send)).rejects.toBeDefined();
        }
        expect(alerts.open).not.toHaveBeenCalled();

        await expect(service.run(account(), send)).rejects.toBeDefined();
        expect(alerts.open).toHaveBeenCalledWith(
            expect.anything(),
            ENUM_CHANNEL_ALERT.SEND_FAILING,
            expect.anything()
        );
    });

    it('a success in between starts the count over', async () => {
        const { service, alerts } = makeService();
        const fail = jest.fn().mockRejectedValue(upstream(400));
        const ok = jest.fn().mockResolvedValue({ externalId: 'm' });

        await service.run(account(), fail).catch(() => {});
        await service.run(account(), fail).catch(() => {});
        await service.run(account(), ok);
        await service.run(account(), fail).catch(() => {});
        await service.run(account(), fail).catch(() => {});

        expect(alerts.open).not.toHaveBeenCalled();
    });

    it('does not count failures about one customer', async () => {
        const { service, alerts, rateLimit } = makeService();
        const send = jest
            .fn()
            .mockRejectedValue(upstream(400, { error: { code: 551 } }));

        for (let i = 0; i < 5; i++) {
            await service.run(account(), send).catch(() => {});
        }
        expect(rateLimit.claim).not.toHaveBeenCalled();
        expect(alerts.open).not.toHaveBeenCalled();
    });

    it('closes an open alert on the next success', async () => {
        const { service, alerts } = makeService();
        const acc = { id: 'acc-1', sendFailingSince: new Date() } as any;

        await service.run(acc, async () => ({ externalId: 'm' }));

        expect(alerts.recovered).toHaveBeenCalledWith(acc);
    });

    it('still throws the send error when alerting itself fails', async () => {
        const { service, alerts } = makeService();
        alerts.open.mockRejectedValue(new Error('db down'));
        const err = upstream(401);

        await expect(
            service.run(account(), jest.fn().mockRejectedValue(err))
        ).rejects.toBe(err);
    });
});

describe('ChannelDeliveryService late outcomes (API channel callback)', () => {
    it('does not count a returned send as delivered when the adapter confirms later', async () => {
        const { service, rateLimit, alerts } = makeService();
        const acc = { id: 'acc-1', sendFailingSince: new Date() } as any;

        await service.run(acc, async () => ({ externalId: 'm' }), false);

        expect(rateLimit.reset).not.toHaveBeenCalled();
        expect(alerts.recovered).not.toHaveBeenCalled();
    });

    it('counts reported failures toward a send-failing alert, even 4xx ones', async () => {
        const { service, alerts } = makeService();
        const err = new AxiosError('x', undefined);

        for (let i = 0; i < 3; i++) await service.report(account(), err);

        expect(alerts.open).toHaveBeenCalledWith(
            expect.anything(),
            ENUM_CHANNEL_ALERT.SEND_FAILING,
            err
        );
    });

    it('a reported delivery closes an open alert', async () => {
        const { service, alerts } = makeService();
        const acc = { id: 'acc-1', sendFailingSince: new Date() } as any;

        await service.report(acc);

        expect(alerts.recovered).toHaveBeenCalledWith(acc);
    });
});
