import { TurnContextService } from '@app/modules/platform/services/turn-context.service';
import { ENUM_ACCOUNT_TYPE } from '../../../src/modules/account/enums/account.enum';
import { ENUM_CONVERSATION_STATUS } from '../../../src/modules/conversation/enums/conversation.enum';
import { ReplyGenerationService } from '../../../src/modules/platform/services/reply-generation.service';
import { StreamingDelivery } from '../../../src/modules/platform/services/streaming-delivery.service';
import { ormStub } from '../../helpers/orm-stub';

/** Fake SSE stream: emits one text event, then 'end' on the next tick. */
function fakeStream() {
    const handlers: Record<string, ((...a: any[]) => void)[]> = {};
    const stream: any = {
        on(event: string, fn: any) {
            (handlers[event] ||= []).push(fn);
            return stream;
        },
    };
    setImmediate(() => {
        handlers['data']?.forEach(fn =>
            fn(
                Buffer.from(
                    'data: {"type":"text-delta","id":"t1","delta":"hello"}\n'
                )
            )
        );
        handlers['end']?.forEach(fn => fn());
    });
    return stream;
}

/** Fake SSE stream emitting each provided line as its own chunk, then 'end'. */
function streamFrom(lines: string[]) {
    const handlers: Record<string, ((...a: any[]) => void)[]> = {};
    const stream: any = {
        on(event: string, fn: any) {
            (handlers[event] ||= []).push(fn);
            return stream;
        },
    };
    setImmediate(() => {
        for (const line of lines) {
            handlers['data']?.forEach(fn => fn(Buffer.from(line + '\n')));
        }
        handlers['end']?.forEach(fn => fn());
    });
    return stream;
}

/** No stored images in these turns: attachments resolve to nothing. */
const noMedia = { resolve: async () => [] };

describe('ReplyGenerationService.run — generation lease (candidate 2)', () => {
    const conversationService = {
        findOneById: jest.fn(),
        recordFallback: jest.fn(),
        triggerHandoff: jest.fn(),
        resetFallbackCount: jest.fn(),
    };
    const accountService = { findOne: jest.fn() };
    const chatbotAIService = { streamChat: jest.fn() };
    const messageRepository = {
        findByConversation: jest.fn(),
        findRecentByConversation: jest.fn(),
        findLatestInbound: jest.fn(),
        insertPendingOutbound: jest.fn(),
        markOutboundSent: jest.fn(),
        markOutboundFailed: jest.fn(),
    };
    // Flat adapter mock — StreamingDelivery calls adapter.sendMessage directly
    const adapterSendMessage = jest.fn();
    const mockAdapter = {
        sendMessage: adapterSendMessage,
        startTyping: jest.fn(),
    };
    const registry = { get: jest.fn(() => mockAdapter) };
    const manifestBuilder = { build: jest.fn().mockResolvedValue([]) };
    const lease = { current: jest.fn(), isCurrent: jest.fn() };
    const meter = {
        check: jest.fn().mockResolvedValue({ allowed: true }),
        record: jest.fn(),
    };

    let replyGeneration: ReplyGenerationService;

    const replyInput = {
        conversationId: 'conv-1',
        senderId: 'sender-1',
        customerId: 'cust-1',
        contactPointId: 'cp-1',
        texts: ['hello there'],
    };

    beforeEach(() => {
        jest.clearAllMocks();
        meter.check.mockResolvedValue({ allowed: true });
        const mockModuleRef = { get: jest.fn(() => conversationService) };
        replyGeneration = new ReplyGenerationService(
            accountService as any,
            chatbotAIService as any,
            messageRepository as any,
            registry as any,
            lease as any,
            new StreamingDelivery(),
            mockModuleRef as any,
            ormStub(),
            manifestBuilder as any,
            new TurnContextService(
                messageRepository as any,
                noMedia as any,
                {} as any
            ),
            meter as any
        );

        conversationService.findOneById.mockResolvedValue({
            id: 'conv-1',
            botEnabled: true,
            status: ENUM_CONVERSATION_STATUS.OPEN,
            account: { id: 'account-1' },
        });
        accountService.findOne.mockResolvedValue({
            id: 'account-1',
            type: ENUM_ACCOUNT_TYPE.FACEBOOK_PAGE,
            chatbot: {
                id: 'chatbot-1',
                workspace: { id: 'ws-1' },
                typingIndicator: false,
                handoffFallbackThreshold: 3,
                handoffMessage: null,
                fallbackMessage: null,
            },
        });
        messageRepository.findByConversation.mockResolvedValue([]);
        messageRepository.findRecentByConversation.mockResolvedValue([]);
        messageRepository.findLatestInbound.mockResolvedValue({
            id: 'msg-trigger-1',
        });
        chatbotAIService.streamChat.mockImplementation(async () =>
            fakeStream()
        );
        lease.current.mockResolvedValue(5);
    });

    it('sends the reply when the generation is still current', async () => {
        lease.isCurrent.mockResolvedValue(true);
        adapterSendMessage.mockResolvedValue({ externalId: 'mid-out' });

        await replyGeneration.run(replyInput);

        expect(messageRepository.insertPendingOutbound).toHaveBeenCalledTimes(
            1
        );
        expect(adapterSendMessage).toHaveBeenCalledWith(
            expect.anything(),
            'sender-1',
            expect.objectContaining({
                content: { kind: 'text', text: 'hello' },
            })
        );
        expect(chatbotAIService.streamChat).toHaveBeenCalledWith(
            expect.objectContaining({ trigger_message_id: 'msg-trigger-1' }),
            expect.anything()
        );
    });

    it('sends a separate message for each text segment split at tool calls', async () => {
        lease.isCurrent.mockResolvedValue(true);
        adapterSendMessage
            .mockResolvedValueOnce({ externalId: 'mid-1' })
            .mockResolvedValueOnce({ externalId: 'mid-2' });
        chatbotAIService.streamChat.mockImplementation(async () =>
            streamFrom([
                'data: {"type":"text-delta","id":"t1","delta":"Let me check that for you"}',
                'data: {"type":"tool-input-start","toolCallId":"t1","toolName":"products_search"}',
                'data: {"type":"tool-output-available","toolCallId":"t1","output":{"status":"error"}}',
                'data: {"type":"text-delta","id":"t2","delta":"Sorry, the system is down"}',
            ])
        );

        await replyGeneration.run(replyInput);

        expect(adapterSendMessage).toHaveBeenCalledTimes(2);
        expect(adapterSendMessage).toHaveBeenNthCalledWith(
            1,
            expect.anything(),
            'sender-1',
            expect.objectContaining({
                content: { kind: 'text', text: 'Let me check that for you' },
            })
        );
        expect(adapterSendMessage).toHaveBeenNthCalledWith(
            2,
            expect.anything(),
            'sender-1',
            expect.objectContaining({
                content: { kind: 'text', text: 'Sorry, the system is down' },
            })
        );
        expect(messageRepository.insertPendingOutbound).toHaveBeenCalledTimes(
            2
        );
    });

    // Public build: no meter is wired, so the reply is generated and delivered
    // as usual, and nothing is booked.
    it('delivers the reply when no meter is wired', async () => {
        lease.isCurrent.mockResolvedValue(true);
        adapterSendMessage.mockResolvedValue({ externalId: 'mid-out' });
        const unmetered = new ReplyGenerationService(
            accountService as any,
            chatbotAIService as any,
            messageRepository as any,
            registry as any,
            lease as any,
            new StreamingDelivery(),
            { get: jest.fn(() => conversationService) } as any,
            ormStub(),
            manifestBuilder as any,
            new TurnContextService(
                messageRepository as any,
                noMedia as any,
                {} as any
            )
        );

        await unmetered.run(replyInput);

        expect(chatbotAIService.streamChat).toHaveBeenCalled();
        expect(adapterSendMessage).toHaveBeenCalledWith(
            expect.anything(),
            'sender-1',
            expect.objectContaining({
                content: { kind: 'text', text: 'hello' },
            })
        );
        expect(conversationService.recordFallback).not.toHaveBeenCalled();
    });

    it('discards (no send) when a newer message superseded the generation', async () => {
        // Stream completes, but the per-segment guard sees the epoch moved.
        lease.isCurrent.mockResolvedValue(false);

        await replyGeneration.run(replyInput);

        expect(adapterSendMessage).not.toHaveBeenCalled();
        expect(messageRepository.insertPendingOutbound).not.toHaveBeenCalled();
    });
});
