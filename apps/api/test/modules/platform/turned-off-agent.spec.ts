import { ENUM_ACCOUNT_TYPE } from '../../../src/modules/account/enums/account.enum';
import { ENUM_CHATBOT_STATUS } from '../../../src/modules/chatbot/enums/chatbot.enum';
import { ENUM_CONVERSATION_STATUS } from '../../../src/modules/conversation/enums/conversation.enum';
import { MessageProcessorService } from '../../../src/modules/platform/services/message-processor.service';
import { PlatformWebhookEvent } from '../../../src/modules/platform/interfaces/platform-adapter.interface';
import { WidgetChatService } from '../../../src/modules/platform/services/widget-chat.service';
import { FollowupService } from '@app/modules/platform/services/followup.service';
import {
    ENUM_FOLLOWUP_SKIP_REASON,
    ENUM_FOLLOWUP_STATUS,
} from '@app/modules/platform/constants/followup.constant';
import { IFollowupJob } from '@app/modules/platform/interfaces/followup.interface';
import { makeFollowupRepository } from './followup.fixtures';
import { ENUM_WORKSPACE_STATUS } from '../../../src/modules/workspace/enums/workspace.enum';

jest.mock('../../../src/common/utils/fetch-as-base64.util', () => ({
    fetchAsBase64: jest.fn(async (url: string) => `base64:${url}`),
}));

/**
 * A turned-off (inactive or archived) agent keeps its channel's inbox: the
 * customer's message is stored and shows in Conversations, as with a
 * conversation whose bot is disabled, but the agent does not answer or hand
 * off until it is activated. The same holds on the website widget, which
 * answers on its own path, and for scheduled follow-ups.
 */
describe('MessageProcessorService — agent turned off', () => {
    let processor: MessageProcessorService;

    const accountService = { findOne: jest.fn() };
    const conversationService = {
        findOrCreate: jest.fn(),
        updateSenderProfile: jest.fn(),
        touchLastMessage: jest.fn(),
        updateStatus: jest.fn(),
        detectHandoffKeywords: jest.fn(() => null),
    };
    const messageRepository = {
        upsertByExternalId: jest.fn().mockResolvedValue({ id: 'msg-row-1' }),
    };
    const adapter = {
        fetchSenderProfile: jest.fn(),
        markRead: jest.fn().mockResolvedValue(undefined),
        startTyping: jest.fn().mockResolvedValue(undefined),
    };
    const registry = { get: jest.fn(() => adapter) };
    const customerService = {
        resolveContactPoint: jest.fn(),
        updateContactPointProfile: jest.fn(),
        fillCustomerNameIfEmpty: jest.fn(),
    };
    const customerTagClassifierService = {
        scheduleAfterMessage: jest.fn().mockResolvedValue(undefined),
    };
    const messageDebounceService = {
        schedule: jest.fn().mockResolvedValue(undefined),
    };
    const actionRouter = {
        dispatch: jest.fn().mockResolvedValue(false),
        register: jest.fn(),
    };
    const chatbotAIService = {
        deleteSession: jest.fn().mockResolvedValue(undefined),
    };
    const lease = { bump: jest.fn(), current: jest.fn(), isCurrent: jest.fn() };
    const dedupe = {
        claim: jest.fn().mockResolvedValue(true),
        release: jest.fn(),
    };

    const live: PlatformWebhookEvent = {
        kind: 'message',
        accountKey: 'page-external-1',
        senderId: 'customer-1',
        recipientId: 'page-external-1',
        text: 'is this still available?',
        externalMessageId: 'm_1',
        timestamp: new Date('2026-10-12T08:00:00Z'),
        raw: {},
    };

    let conversation: Record<string, unknown>;

    beforeEach(() => {
        jest.clearAllMocks();
        processor = new MessageProcessorService(
            accountService as any,
            messageRepository as any,
            registry as any,
            customerService as any,
            customerTagClassifierService as any,
            messageDebounceService as any,
            actionRouter as any,
            { get: jest.fn(() => conversationService) } as any,
            chatbotAIService as any,
            lease as any,
            dedupe as any,
            {} as any
        );
        processor.onModuleInit();

        accountService.findOne.mockResolvedValue({
            id: 'account-1',
            externalId: 'page-external-1',
            type: ENUM_ACCOUNT_TYPE.FACEBOOK_PAGE,
            chatbot: {
                id: 'chatbot-1',
                workspace: { id: 'workspace-1' },
                handoffKeywords: [],
                autoRead: true,
                typingIndicator: true,
                status: ENUM_CHATBOT_STATUS.INACTIVE,
            },
        });
        customerService.resolveContactPoint.mockResolvedValue({
            contactPoint: { id: 'cp-1' },
            customerId: 'cust-1',
        });
        conversation = {
            id: 'conv-1',
            status: ENUM_CONVERSATION_STATUS.OPEN,
            botEnabled: true,
            senderProfileFetchedAt: null,
        };
        conversationService.findOrCreate.mockImplementation(
            async () => conversation
        );
        adapter.fetchSenderProfile.mockResolvedValue({
            id: 'customer-1',
            name: 'Lan Nguyen',
            avatar: 'https://cdn/lan.jpg',
        });
    });

    it.each([ENUM_CHATBOT_STATUS.INACTIVE, ENUM_CHATBOT_STATUS.ARCHIVED])(
        'does not answer while the agent is %s',
        async status => {
            const base = await accountService.findOne();
            accountService.findOne.mockResolvedValue({
                ...base,
                chatbot: { ...base.chatbot, status },
            });

            await processor.process(live);

            expect(messageDebounceService.schedule).not.toHaveBeenCalled();
            expect(adapter.startTyping).not.toHaveBeenCalled();
            expect(adapter.markRead).not.toHaveBeenCalled();
        }
    );

    it('still stores the message so it shows in the inbox', async () => {
        await processor.process(live);

        expect(messageRepository.upsertByExternalId).toHaveBeenCalledWith(
            'conv-1',
            'm_1',
            expect.objectContaining({ text: 'is this still available?' })
        );
        expect(conversationService.touchLastMessage).toHaveBeenCalled();
    });

    it('does not answer while an admin has suspended the workspace', async () => {
        const base = await accountService.findOne();
        accountService.findOne.mockResolvedValue({
            ...base,
            chatbot: {
                ...base.chatbot,
                status: ENUM_CHATBOT_STATUS.ACTIVE,
                workspace: {
                    id: 'workspace-1',
                    status: ENUM_WORKSPACE_STATUS.SUSPENDED,
                },
            },
        });

        await processor.process(live);

        expect(messageRepository.upsertByExternalId).toHaveBeenCalled();
        expect(messageDebounceService.schedule).not.toHaveBeenCalled();
    });

    it('answers once the agent is active', async () => {
        const base = await accountService.findOne();
        accountService.findOne.mockResolvedValue({
            ...base,
            chatbot: { ...base.chatbot, status: ENUM_CHATBOT_STATUS.ACTIVE },
        });

        await processor.process(live);

        expect(messageDebounceService.schedule).toHaveBeenCalled();
    });
});

describe('WidgetChatService — agent turned off', () => {
    const res = {
        write: jest.fn(),
        end: jest.fn(),
        setHeader: jest.fn(),
    } as any;

    function widget(status: ENUM_CHATBOT_STATUS) {
        const messageRepository = {
            upsertByExternalId: jest.fn(async () => ({ id: 'msg-in' })),
        };
        const chatbotAIService = { streamChat: jest.fn() };
        const conversationService = {
            findOrCreate: jest.fn(async () => ({
                id: 'conv-1',
                botEnabled: true,
            })),
            touchLastMessage: jest.fn(async () => {}),
            reopenIfResolved: jest.fn(async () => {}),
            detectHandoffKeywords: jest.fn(() => null),
            triggerHandoff: jest.fn(),
        };
        const service = new WidgetChatService(
            {
                resolveContactPoint: jest.fn(async () => ({
                    contactPoint: { id: 'cp-1' },
                    customerId: 'cust-1',
                })),
            } as any,
            conversationService as any,
            messageRepository as any,
            chatbotAIService as any,
            {} as any, // sseStream
            {} as any, // turnContext
            { wantsPerson: jest.fn() } as any
        );
        const turn = {
            account: {
                id: 'acc-1',
                type: ENUM_ACCOUNT_TYPE.WEBSITE_WIDGET,
                chatbot: { id: 'cb-1', status },
                workspace: { id: 'ws-1' },
            } as any,
            visitorId: 'visitor-7',
            text: 'do you ship to Da Nang?',
            messageId: 'wm-1',
        };
        return {
            service,
            turn,
            messageRepository,
            chatbotAIService,
            conversationService,
        };
    }

    it.each([ENUM_CHATBOT_STATUS.INACTIVE, ENUM_CHATBOT_STATUS.ARCHIVED])(
        'keeps the visitor message but does not answer when the agent is %s',
        async status => {
            const {
                service,
                turn,
                messageRepository,
                chatbotAIService,
                conversationService,
            } = widget(status);

            await service.handleTurn(res, turn);

            expect(messageRepository.upsertByExternalId).toHaveBeenCalled();
            expect(conversationService.triggerHandoff).not.toHaveBeenCalled();
            expect(chatbotAIService.streamChat).not.toHaveBeenCalled();
            expect(res.end).toHaveBeenCalled();
        }
    );
});

describe('WidgetChatService — workspace suspended', () => {
    it('keeps the visitor message but does not answer', async () => {
        const res = { write: jest.fn(), end: jest.fn(), setHeader: jest.fn() };
        const messageRepository = {
            upsertByExternalId: jest.fn(async () => ({ id: 'msg-in' })),
        };
        const chatbotAIService = { streamChat: jest.fn() };
        const service = new WidgetChatService(
            {
                resolveContactPoint: jest.fn(async () => ({
                    contactPoint: { id: 'cp-1' },
                    customerId: 'cust-1',
                })),
            } as any,
            {
                findOrCreate: jest.fn(async () => ({
                    id: 'conv-1',
                    botEnabled: true,
                })),
                touchLastMessage: jest.fn(async () => {}),
                reopenIfResolved: jest.fn(async () => {}),
                detectHandoffKeywords: jest.fn(() => null),
                triggerHandoff: jest.fn(),
            } as any,
            messageRepository as any,
            chatbotAIService as any,
            {} as any,
            {} as any,
            { wantsPerson: jest.fn() } as any
        );

        await service.handleTurn(res as any, {
            account: {
                id: 'acc-1',
                type: ENUM_ACCOUNT_TYPE.WEBSITE_WIDGET,
                chatbot: { id: 'cb-1', status: ENUM_CHATBOT_STATUS.ACTIVE },
                workspace: {
                    id: 'ws-1',
                    status: ENUM_WORKSPACE_STATUS.SUSPENDED,
                },
            } as any,
            visitorId: 'visitor-7',
            text: 'do you ship to Da Nang?',
            messageId: 'wm-1',
        });

        expect(messageRepository.upsertByExternalId).toHaveBeenCalled();
        expect(chatbotAIService.streamChat).not.toHaveBeenCalled();
        expect(res.end).toHaveBeenCalled();
    });
});

describe('FollowupService — agent turned off', () => {
    const job: IFollowupJob = {
        conversationId: 'conv-1',
        chatbotId: 'cb-1',
        userId: 'psid-1',
        providerId: 'acc-1',
        customerId: 'cust-1',
        contactPointId: 'cp-1',
        prompt: 'check payment',
        reason: 'payment_check',
    };

    it.each([
        [ENUM_CHATBOT_STATUS.INACTIVE, ENUM_WORKSPACE_STATUS.ACTIVE],
        [ENUM_CHATBOT_STATUS.ARCHIVED, ENUM_WORKSPACE_STATUS.ACTIVE],
        [ENUM_CHATBOT_STATUS.ACTIVE, ENUM_WORKSPACE_STATUS.SUSPENDED],
    ])(
        'skips the follow-up when the agent is %s in a %s workspace',
        async (status, workspaceStatus) => {
            const streamChat = jest.fn();
            const account = {
                id: 'acc-1',
                type: 'telegram',
                chatbot: {
                    id: 'cb-1',
                    status,
                    workspace: { id: 'ws-1', status: workspaceStatus },
                },
            };
            const service = new FollowupService(
                {} as any,
                makeFollowupRepository([]) as any,
                { findOne: jest.fn().mockResolvedValue(account) } as any,
                { streamChat } as any,
                {} as any,
                { get: jest.fn().mockReturnValue({}) } as any,
                { build: jest.fn().mockResolvedValue([]) } as any,
                {} as any,
                {} as any,
                { build: jest.fn().mockResolvedValue({ history: [] }) } as any,
                {} as any
            );
            const recordOutcome = jest
                .spyOn(service as any, 'recordOutcome')
                .mockResolvedValue(undefined);

            await (service as any).generateAndDeliver(null, job);

            expect(streamChat).not.toHaveBeenCalled();
            expect(recordOutcome).toHaveBeenCalledWith(null, 'conv-1', {
                status: ENUM_FOLLOWUP_STATUS.SKIPPED,
                outcomeReason: ENUM_FOLLOWUP_SKIP_REASON.BOT_DISABLED,
            });
        }
    );
});
