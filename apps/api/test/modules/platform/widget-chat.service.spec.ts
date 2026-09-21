import { ENUM_ACCOUNT_TYPE } from '../../../src/modules/account/enums/account.enum';
import {
    ENUM_MESSAGE_AUTHOR,
    ENUM_MESSAGE_DIRECTION,
} from '../../../src/modules/conversation/enums/message.enum';
import { WidgetChatService } from '../../../src/modules/platform/services/widget-chat.service';

const account = {
    id: 'acc-1',
    externalId: 'widget-key-1',
    type: ENUM_ACCOUNT_TYPE.WEBSITE_WIDGET,
    chatbot: {
        id: 'cb-1',
        modelProvider: 'openrouter',
        modelTextName: 'gpt-4o-mini',
        fallbackMessage: 'Sorry, I cannot answer right now.',
    },
    workspace: { id: 'ws-1' },
} as any;

function setup(overrides: Record<string, any> = {}) {
    const conversation = {
        id: 'conv-1',
        botEnabled: true,
        ...(overrides.conversation ?? {}),
    };

    const customerService = {
        resolveContactPoint: jest.fn(async () => ({
            contactPoint: { id: 'cp-1' },
            customerId: 'cust-1',
            created: true,
        })),
    };
    const conversationService = {
        findOrCreate: jest.fn(async () => conversation),
        touchLastMessage: jest.fn(async () => {}),
    };
    const messageRepository = {
        upsertByExternalId: jest.fn(async () => ({ id: 'msg-in' })),
        findRecentByConversation: jest.fn(async () => []),
        insertPendingOutbound: jest.fn(async () => ({ id: 'msg-out' })),
        markOutboundSent: jest.fn(async () => {}),
        ...(overrides.messageRepository ?? {}),
    };
    const chatbotAIService = {
        streamChat: jest.fn(async () => ({ pipe: jest.fn() })),
    };
    const sseStream = {
        pipe: jest.fn(async ({ onFinalize }: any) => {
            await onFinalize('the bot reply');
        }),
    };

    const meter = {
        check: jest.fn().mockResolvedValue({ allowed: true }),
        record: jest.fn(),
    };

    const service = new WidgetChatService(
        customerService as any,
        conversationService as any,
        messageRepository as any,
        chatbotAIService as any,
        sseStream as any,
        meter as any
    );

    /** No meter at all — the public build, where metering is absent. */
    const unmetered = new WidgetChatService(
        customerService as any,
        conversationService as any,
        messageRepository as any,
        chatbotAIService as any,
        sseStream as any
    );

    return {
        service,
        unmetered,
        meter,
        customerService,
        conversationService,
        messageRepository,
        chatbotAIService,
        sseStream,
        conversation,
    };
}

const res = { write: jest.fn(), end: jest.fn(), setHeader: jest.fn() } as any;

const turn = {
    account,
    visitorId: 'visitor-7',
    text: 'do you ship to Da Nang?',
    messageId: 'wm-1',
};

describe('WidgetChatService.handleTurn', () => {
    it('resolves the visitor to a real contact point in the account workspace', async () => {
        const { service, customerService } = setup();

        await service.handleTurn(res, turn);

        expect(customerService.resolveContactPoint).toHaveBeenCalledWith({
            workspaceId: 'ws-1',
            platform: ENUM_ACCOUNT_TYPE.WEBSITE_WIDGET,
            externalSenderId: 'visitor-7',
        });
    });

    it('persists the conversation keyed on chatbot, account and visitor', async () => {
        const { service, conversationService } = setup();

        await service.handleTurn(res, turn);

        expect(conversationService.findOrCreate).toHaveBeenCalledWith({
            chatbotId: 'cb-1',
            accountId: 'acc-1',
            senderId: 'visitor-7',
            contactPointId: 'cp-1',
        });
    });

    it('persists the inbound message idempotently on the caller message id', async () => {
        const { service, messageRepository } = setup();

        await service.handleTurn(res, turn);

        expect(messageRepository.upsertByExternalId).toHaveBeenCalledWith(
            'conv-1',
            'wm-1',
            expect.objectContaining({
                direction: ENUM_MESSAGE_DIRECTION.INBOUND,
                authorType: ENUM_MESSAGE_AUTHOR.USER,
                text: 'do you ship to Da Nang?',
            })
        );
    });

    it('feeds the AI history from Postgres, not an ephemeral cache', async () => {
        const { service, messageRepository, chatbotAIService } = setup({
            messageRepository: {
                findRecentByConversation: jest.fn(async () => [
                    {
                        direction: ENUM_MESSAGE_DIRECTION.INBOUND,
                        text: 'earlier question',
                    },
                    {
                        direction: ENUM_MESSAGE_DIRECTION.OUTBOUND,
                        text: 'earlier answer',
                    },
                    {
                        direction: ENUM_MESSAGE_DIRECTION.INBOUND,
                        externalId: 'wm-1',
                        text: 'do you ship to Da Nang?',
                    },
                ]),
            },
        });

        await service.handleTurn(res, turn);

        expect(messageRepository.findRecentByConversation).toHaveBeenCalled();
        const [params] = chatbotAIService.streamChat.mock.calls[0] as any;
        expect(params.history).toEqual([
            { role: 'user', content: 'earlier question' },
            { role: 'assistant', content: 'earlier answer' },
        ]);
    });

    it('persists the bot reply once the stream finalizes', async () => {
        const { service, messageRepository } = setup();

        await service.handleTurn(res, turn);

        expect(messageRepository.insertPendingOutbound).toHaveBeenCalledWith(
            'conv-1',
            expect.any(String),
            expect.objectContaining({
                authorType: ENUM_MESSAGE_AUTHOR.BOT,
                text: 'the bot reply',
            })
        );
        expect(messageRepository.markOutboundSent).toHaveBeenCalled();
    });

    it('persists the visitor message but generates nothing when the bot is paused', async () => {
        const { service, chatbotAIService, messageRepository } = setup({
            conversation: { botEnabled: false },
        });

        await service.handleTurn(res, turn);

        expect(messageRepository.upsertByExternalId).toHaveBeenCalled();
        expect(chatbotAIService.streamChat).not.toHaveBeenCalled();
        expect(messageRepository.insertPendingOutbound).not.toHaveBeenCalled();
    });

    it('rejects an account with no chatbot attached', async () => {
        const { service } = setup();

        await expect(
            service.handleTurn(res, {
                ...turn,
                account: { ...account, chatbot: undefined },
            })
        ).rejects.toThrow();
    });
});

describe('WidgetChatService token budget', () => {
    it('records the turn usage against the account workspace', async () => {
        const { service, meter, sseStream } = setup();
        sseStream.pipe.mockImplementation(async ({ onUsage }: any) => {
            await onUsage({
                inputTokens: 10,
                outputTokens: 5,
                totalTokens: 15,
            });
        });

        await service.handleTurn(res, turn);

        expect(meter.record).toHaveBeenCalledWith(
            expect.objectContaining({
                workspaceId: 'ws-1',
                chatbotId: 'cb-1',
                source: 'WIDGET',
                usage: { inputTokens: 10, outputTokens: 5, totalTokens: 15 },
            })
        );
    });

    // The visitor gets the fallback line over the same stream, and apps/ai is
    // never called — the point is to not burn tokens we cannot bill.
    it('streams the fallback message and skips the AI when the budget is spent', async () => {
        const { service, meter, chatbotAIService } = setup();
        meter.check.mockResolvedValue({
            allowed: false,
            reason: 'QUOTA_EXHAUSTED',
        });
        const blockedRes = {
            write: jest.fn(),
            end: jest.fn(),
            setHeader: jest.fn(),
        } as any;

        await service.handleTurn(blockedRes, turn);

        expect(chatbotAIService.streamChat).not.toHaveBeenCalled();
        const written = blockedRes.write.mock.calls
            .map((c: any[]) => c[0])
            .join('');
        expect(written).toContain('Sorry, I cannot answer right now.');
        expect(written).toContain('[DONE]');
        expect(blockedRes.end).toHaveBeenCalled();
    });

    // Public build: no meter is wired, so the turn reaches apps/ai as usual.
    it('generates the reply when no meter is wired', async () => {
        const { unmetered, chatbotAIService, messageRepository } = setup();

        await unmetered.handleTurn(res, turn);

        expect(chatbotAIService.streamChat).toHaveBeenCalled();
        expect(messageRepository.insertPendingOutbound).toHaveBeenCalledWith(
            'conv-1',
            expect.any(String),
            expect.objectContaining({ text: 'the bot reply' })
        );
    });

    it('still persists the visitor message when the budget is spent', async () => {
        const { service, meter, messageRepository } = setup();
        meter.check.mockResolvedValue({ allowed: false });

        await service.handleTurn(
            { write: jest.fn(), end: jest.fn(), setHeader: jest.fn() } as any,
            turn
        );

        expect(messageRepository.upsertByExternalId).toHaveBeenCalled();
    });
});
