import { Logger } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AI_USAGE_METER } from '@app/app/ai-usage-meter.interface';
import { MeteringStatusLogger } from '@app/app/metering-status.logger';
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

    it('logs disabled for both seams when neither provider is registered', async () => {
        const moduleRef = await Test.createTestingModule({
            providers: [MeteringStatusLogger],
        }).compile();

        moduleRef.get(MeteringStatusLogger).onApplicationBootstrap();

        const message = bootMessage();
        expect((message.match(/disabled/g) ?? []).length).toBe(2);
    });

    it('logs enabled for both seams when both providers are registered', async () => {
        const moduleRef = await Test.createTestingModule({
            providers: [
                MeteringStatusLogger,
                { provide: AI_USAGE_METER, useValue: {} },
                { provide: WORKSPACE_CREATED_HOOK, useValue: {} },
            ],
        }).compile();

        moduleRef.get(MeteringStatusLogger).onApplicationBootstrap();

        const message = bootMessage();
        expect((message.match(/enabled/g) ?? []).length).toBe(2);
    });
});
