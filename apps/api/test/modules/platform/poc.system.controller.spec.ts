import { BadGatewayException, ValidationPipe } from '@nestjs/common';
import { NotImplementedException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import {
    REQUEST_CUSTOM_TIMEOUT_META_KEY,
    REQUEST_CUSTOM_TIMEOUT_VALUE_META_KEY,
} from '../../../src/common/request/constants/request.constant';
import { ENUM_ACCOUNT_TYPE } from '../../../src/modules/account/enums/account.enum';
import { REQUEST_VALIDATION_PIPE_OPTIONS } from '../../../src/common/request/constants/request.constant';
import {
    PocReplyDto,
    PocSystemController,
} from '../../../src/modules/platform/controllers/poc.system.controller';
import { PlatformAdapterRegistry } from '../../../src/modules/platform/services/platform-adapter.registry';
import { MessageProcessorService } from '../../../src/modules/platform/services/message-processor.service';
import { ReplyGenerationService } from '../../../src/modules/platform/services/reply-generation.service';
import { ReplyMissedAlertService } from '../../../src/modules/platform/services/reply-missed-alert.service';

describe('PocSystemController.inbound', () => {
    let controller: PocSystemController;
    const parse = jest.fn();
    const verifySignature = jest.fn();
    const process = jest.fn();
    const run = jest.fn();
    const reportTurnMiss = jest.fn();
    const registry = {
        get: jest.fn(() => ({ parse, verifySignature })),
        has: jest.fn(() => true),
    };

    beforeEach(async () => {
        parse.mockReset();
        verifySignature.mockReset();
        process.mockReset();
        run.mockReset().mockResolvedValue({ status: 'delivered' });
        reportTurnMiss.mockReset().mockResolvedValue(undefined);
        registry.get.mockClear();
        registry.has.mockClear();
        const module: TestingModule = await Test.createTestingModule({
            controllers: [PocSystemController],
            providers: [
                { provide: PlatformAdapterRegistry, useValue: registry },
                { provide: MessageProcessorService, useValue: { process } },
                { provide: ReplyGenerationService, useValue: { run } },
                {
                    provide: ReplyMissedAlertService,
                    useValue: { reportTurnMiss },
                },
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

    it('acks and drops platforms whose adapter is not built yet, so the edge does not retry them', async () => {
        verifySignature.mockImplementation(() => {
            throw new NotImplementedException();
        });
        const res = await controller.inbound({
            platform: 'tiktok',
            rawBody: '{}',
            headers: {},
        });
        expect(parse).not.toHaveBeenCalled();
        expect(process).not.toHaveBeenCalled();
        expect(res).toEqual({ processed: 0 });
    });

    it('still throws other verification errors', async () => {
        verifySignature.mockImplementation(() => {
            throw new Error('boom');
        });
        await expect(
            controller.inbound({
                platform: 'zalo',
                rawBody: '{}',
                headers: {},
            })
        ).rejects.toThrow('boom');
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

    it('answers 502 with the reason when nothing reached the customer', async () => {
        run.mockResolvedValueOnce({
            status: 'failed',
            reason: 'stream_failed',
        });

        const reply = controller.reply({
            conversationId: 'c',
            senderId: 's',
            customerId: 'cu',
            contactPointId: 'cp',
            texts: ['a'],
            messageIds: ['m-1', 'm-2'],
        });

        await expect(reply).rejects.toBeInstanceOf(BadGatewayException);
        await expect(reply).rejects.toMatchObject({
            response: { data: { reason: 'stream_failed' } },
        });
        expect(reportTurnMiss).toHaveBeenCalledWith({
            source: 'poc-reply',
            conversationId: 'c',
            reason: 'stream_failed',
            messageIds: ['m-1', 'm-2'],
        });
    });

    it('does not report a miss for a skipped reply — the silence was deliberate', async () => {
        run.mockResolvedValueOnce({
            status: 'skipped',
            reason: 'bot_disabled',
        });

        await controller.reply({
            conversationId: 'c',
            senderId: 's',
            customerId: 'cu',
            contactPointId: 'cp',
            texts: ['a'],
        });

        expect(reportTurnMiss).not.toHaveBeenCalled();
    });

    it('answers 200 with the outcome for a delivered or skipped reply', async () => {
        run.mockResolvedValueOnce({
            status: 'skipped',
            reason: 'bot_disabled',
        });

        await expect(
            controller.reply({
                conversationId: 'c',
                senderId: 's',
                customerId: 'cu',
                contactPointId: 'cp',
                texts: ['a'],
            })
        ).resolves.toEqual({
            ok: true,
            status: 'skipped',
            reason: 'bot_disabled',
        });
    });

    it('allows a full agent turn on the reply endpoint', () => {
        const handler = PocSystemController.prototype.reply;

        expect(
            Reflect.getMetadata(REQUEST_CUSTOM_TIMEOUT_META_KEY, handler)
        ).toBe(true);
        expect(
            Reflect.getMetadata(REQUEST_CUSTOM_TIMEOUT_VALUE_META_KEY, handler)
        ).toBe('300s');
    });
});

// The edge Worker echoes the debounce job's meta back verbatim. An anonymous
// channel (website widget, API channel) has no Customer, so customerId is null
// and contactPointId is dropped — both used to fail here with 422 and the
// customer got no reply at all (#600).
describe('PocReplyDto validation', () => {
    const pipe = new ValidationPipe(REQUEST_VALIDATION_PIPE_OPTIONS);
    const meta = { type: 'body' as const, metatype: PocReplyDto };
    const body = {
        conversationId: 'c',
        senderId: 's',
        texts: ['hi'],
        messageIds: ['m1'],
    };

    it('accepts a null customerId from an anonymous channel sender', async () => {
        const value = (await pipe.transform(
            { ...body, customerId: null },
            meta
        )) as PocReplyDto;
        expect(value).toBeInstanceOf(PocReplyDto);
        expect(value.customerId).toBeNull();
    });

    it('accepts a body with neither customerId nor contactPointId', async () => {
        await expect(pipe.transform(body, meta)).resolves.toBeInstanceOf(
            PocReplyDto
        );
    });

    it('still rejects a customerId that is not a string', async () => {
        await expect(
            pipe.transform({ ...body, customerId: 42 }, meta)
        ).rejects.toBeDefined();
    });
});
