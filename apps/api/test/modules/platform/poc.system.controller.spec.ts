import { Test, TestingModule } from '@nestjs/testing';
import { ENUM_ACCOUNT_TYPE } from '../../../src/modules/account/enums/account.enum';
import { PocSystemController } from '../../../src/modules/platform/controllers/poc.system.controller';
import { PlatformAdapterRegistry } from '../../../src/modules/platform/services/platform-adapter.registry';
import { MessageProcessorService } from '../../../src/modules/platform/services/message-processor.service';
import { ReplyGenerationService } from '../../../src/modules/platform/services/reply-generation.service';

describe('PocSystemController.inbound', () => {
    let controller: PocSystemController;
    const parse = jest.fn();
    const verifySignature = jest.fn();
    const process = jest.fn();
    const run = jest.fn();
    const registry = {
        get: jest.fn(() => ({ parse, verifySignature })),
        has: jest.fn(() => true),
    };

    beforeEach(async () => {
        parse.mockReset();
        verifySignature.mockReset();
        process.mockReset();
        run.mockReset();
        registry.get.mockClear();
        registry.has.mockClear();
        const module: TestingModule = await Test.createTestingModule({
            controllers: [PocSystemController],
            providers: [
                { provide: PlatformAdapterRegistry, useValue: registry },
                { provide: MessageProcessorService, useValue: { process } },
                { provide: ReplyGenerationService, useValue: { run } },
            ],
        }).compile();
        controller = module.get(PocSystemController);
    });

    it('resolves telegram, verifies, parses, stamps accountKey=botId, processes each event', async () => {
        verifySignature.mockReturnValue(true);
        parse.mockReturnValue([
            {
                kind: 'message',
                externalMessageId: '42',
                senderId: '7',
                text: 'hi',
            },
        ]);
        const res = await controller.inbound({
            platform: 'telegram',
            botId: 'bot123',
            rawBody: '{"m":1}',
            headers: { 'x-telegram-bot-api-secret-token': 't' },
        });
        expect(registry.get).toHaveBeenCalledWith(
            ENUM_ACCOUNT_TYPE.TELEGRAM_BOT
        );
        expect(verifySignature).toHaveBeenCalledWith('{"m":1}', {
            'x-telegram-bot-api-secret-token': 't',
        });
        expect(process).toHaveBeenCalledWith(
            expect.objectContaining({
                externalMessageId: '42',
                accountKey: 'bot123',
            })
        );
        expect(res).toEqual({ processed: 1 });
    });

    it('drops the event (no process) when the signature is invalid', async () => {
        verifySignature.mockReturnValue(false);
        const res = await controller.inbound({
            platform: 'telegram',
            botId: 'bot123',
            rawBody: '{}',
            headers: {},
        });
        expect(parse).not.toHaveBeenCalled();
        expect(process).not.toHaveBeenCalled();
        expect(res).toEqual({ processed: 0 });
    });

    it('reply endpoint delegates to ReplyGenerationService.run', async () => {
        await controller.reply({
            conversationId: 'c',
            senderId: 's',
            customerId: 'cu',
            contactPointId: 'cp',
            texts: ['a', 'b'],
        });
        expect(run).toHaveBeenCalledWith({
            conversationId: 'c',
            senderId: 's',
            customerId: 'cu',
            contactPointId: 'cp',
            texts: ['a', 'b'],
        });
    });
});
