import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HelperDateService } from '../../../src/common/helper/services/helper.date.service';
import { ApiKeyXApiKeyGuard } from '@app/modules/api-key/guards/x-api-key/api-key.x-api-key.guard';
import type { ApiKeyService } from '../../../src/modules/api-key/services/api-key.service';

// test/modules/account/setup.ts stubs this guard for every suite; test the real one.
jest.unmock('@app/modules/api-key/guards/x-api-key/api-key.x-api-key.guard');

// The real service pulls in the whole database layer; the guard only needs its shape.
jest.mock('src/modules/api-key/services/api-key.service', () => ({
    ApiKeyService: class {},
}));

const storedKey = {
    id: 'key-id',
    name: 'App',
    key: 'app-key',
    type: 'DEFAULT',
    isActive: true,
    hash: 'hash-of:app-key:app-secret',
};

function contextFor(header: string) {
    const request: Record<string, any> = { headers: { 'x-api-key': header } };
    return {
        request,
        context: {
            switchToHttp: () => ({ getRequest: () => request }),
        } as unknown as ExecutionContext,
    };
}

function setup(now: () => Date = () => new Date('2026-10-18T00:00:00Z')) {
    const findOneByActiveKey = jest.fn().mockResolvedValue(storedKey);
    const apiKeyService = {
        findOneByActiveKey,
        createHashApiKey: async (key: string, secret: string) =>
            `hash-of:${key}:${secret}`,
        validateHashApiKey: async (a: string, b: string) => a === b,
    } as unknown as ApiKeyService;
    const guard = new ApiKeyXApiKeyGuard(
        { get: () => 'x-api-key' } as unknown as ConfigService,
        apiKeyService,
        { create: now } as unknown as HelperDateService
    );
    return { guard, findOneByActiveKey };
}

describe('ApiKeyXApiKeyGuard', () => {
    it('reads the key from the database once, then from cache', async () => {
        const { guard, findOneByActiveKey } = setup();

        for (let i = 0; i < 3; i++) {
            const { request, context } = contextFor('app-key:app-secret');
            await expect(guard.canActivate(context)).resolves.toBe(true);
            expect(request.apiKey).toEqual({
                id: 'key-id',
                name: 'App',
                key: 'app-key',
                type: 'DEFAULT',
            });
        }

        expect(findOneByActiveKey).toHaveBeenCalledTimes(1);
    });

    it('does not let a wrong secret ride on a cached key', async () => {
        const { guard } = setup();
        await guard.canActivate(contextFor('app-key:app-secret').context);

        await expect(
            guard.canActivate(contextFor('app-key:wrong').context)
        ).rejects.toThrow();
    });

    it('still rejects a cached key once it has expired', async () => {
        let now = new Date('2026-10-18T00:00:00Z');
        const { guard, findOneByActiveKey } = setup(() => now);
        findOneByActiveKey.mockResolvedValue({
            ...storedKey,
            startDate: new Date('2026-10-01T00:00:00Z'),
            endDate: new Date('2026-10-18T00:00:10Z'),
        });
        await guard.canActivate(contextFor('app-key:app-secret').context);

        now = new Date('2026-10-18T00:00:20Z');
        await expect(
            guard.canActivate(contextFor('app-key:app-secret').context)
        ).rejects.toThrow(ForbiddenException);
    });
});
