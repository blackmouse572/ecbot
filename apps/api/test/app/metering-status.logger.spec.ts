import { Logger } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AI_USAGE_METER } from '@app/app/ai-usage-meter.interface';
import { MeteringStatusLogger } from '@app/app/metering-status.logger';
import { KB_STORAGE_LIMIT } from '@app/modules/knowledge-base/interfaces/kb-storage-limit.interface';
import { WORKSPACE_CREATED_HOOK } from '@app/modules/workspace/interfaces/workspace-created-hook.interface';

describe('MeteringStatusLogger', () => {
    let logSpy: jest.SpyInstance;

    beforeEach(() => {
        logSpy = jest.spyOn(Logger.prototype, 'log').mockImplementation();
    });

    afterEach(() => {
        logSpy.mockRestore();
    });

    function bootMessage(): string {
        const call = logSpy.mock.calls.find(
            ([message]) =>
                typeof message === 'string' &&
                message.includes('AI usage metering')
        );
        expect(call).toBeDefined();
        return call![0] as string;
    }

    it('logs disabled for every seam when no provider is registered', async () => {
        const moduleRef = await Test.createTestingModule({
            providers: [MeteringStatusLogger],
        }).compile();

        moduleRef.get(MeteringStatusLogger).onApplicationBootstrap();

        const message = bootMessage();
        expect((message.match(/disabled/g) ?? []).length).toBe(3);
    });

    it('logs enabled for every seam when every provider is registered', async () => {
        const moduleRef = await Test.createTestingModule({
            providers: [
                MeteringStatusLogger,
                { provide: AI_USAGE_METER, useValue: {} },
                { provide: WORKSPACE_CREATED_HOOK, useValue: {} },
                { provide: KB_STORAGE_LIMIT, useValue: {} },
            ],
        }).compile();

        moduleRef.get(MeteringStatusLogger).onApplicationBootstrap();

        const message = bootMessage();
        expect((message.match(/enabled/g) ?? []).length).toBe(3);
    });
});
