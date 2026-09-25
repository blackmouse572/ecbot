import { TurnContextService } from '@app/modules/platform/services/turn-context.service';
import { ENUM_CONVERSATION_STATUS } from '@app/modules/conversation/enums/conversation.enum';
import { ENUM_MESSAGE_DIRECTION } from '@app/modules/conversation/enums/message.enum';
import {
    ENUM_FOLLOWUP_SKIP_REASON,
    ENUM_FOLLOWUP_STATUS,
} from '@app/modules/platform/constants/followup.constant';
import { FollowupService } from '@app/modules/platform/services/followup.service';
import { followupRow, makeFollowupRepository } from '../followup.fixtures';

function makeService(overrides: any = {}) {
    const rows = overrides.rows ?? [];
    const followupRepository =
        overrides.followupRepository ?? makeFollowupRepository(rows);
    const service = new FollowupService(
        {} as any,
        followupRepository as any,
        overrides.accountService,
        overrides.chatbotAIService,
        overrides.messageRepository,
        overrides.registry,
        overrides.manifestBuilder ?? { build: jest.fn().mockResolvedValue([]) },
        overrides.streaming,
        {
            get: jest.fn().mockReturnValue(overrides.conversationService),
        } as any,
        new TurnContextService(
            overrides.messageRepository,
            { resolve: async (list: unknown[] = []) => list } as any,
            {} as any
        ),
        // `meter: null` builds the service without one — the public build.
        overrides.meter === null
            ? undefined
            : (overrides.meter ?? {
                  check: jest.fn().mockResolvedValue({ allowed: true }),
                  record: jest.fn(),
              })
    );
    return { service, rows, followupRepository };
}

const baseData = {
    conversationId: 'conv-1',
    chatbotId: 'cb-1',
    userId: 'psid-1',
    providerId: 'acc-1',
    customerId: 'cust-1',
    contactPointId: 'cp-1',
    prompt: 'check payment',
    reason: 'payment_check',
};

const liveConversation = {
    findOneById: jest.fn().mockResolvedValue({
        id: 'conv-1',
        botEnabled: true,
        status: ENUM_CONVERSATION_STATUS.OPEN,
    }),
};

const liveAccount = {
    findOne: jest.fn().mockResolvedValue({
        id: 'acc-1',
        type: 'messenger',
        chatbot: { id: 'cb-1', workspace: { id: 'ws-1' } },
    }),
};

describe('FollowupService.fire', () => {
    it('skips when the conversation is resolved and records why', async () => {
        const streaming = { deliver: jest.fn() };
        const { service, rows } = makeService({
            rows: [followupRow({ id: 'f-1' })],
            conversationService: {
                findOneById: jest.fn().mockResolvedValue({
                    id: 'conv-1',
                    botEnabled: true,
                    status: ENUM_CONVERSATION_STATUS.RESOLVED,
                }),
            },
            streaming,
        });

        await service.fire({ ...baseData, followupId: 'f-1' });

        expect(streaming.deliver).not.toHaveBeenCalled();
        expect(rows[0]).toEqual(
            expect.objectContaining({
                status: ENUM_FOLLOWUP_STATUS.SKIPPED,
                outcomeReason: ENUM_FOLLOWUP_SKIP_REASON.CONVERSATION_RESOLVED,
                attempts: 1,
            })
        );
    });

    it('skips when the bot is disabled and records why', async () => {
        const streaming = { deliver: jest.fn() };
        const { service, rows } = makeService({
            rows: [followupRow({ id: 'f-1' })],
            conversationService: {
                findOneById: jest.fn().mockResolvedValue({
                    id: 'conv-1',
                    botEnabled: false,
                    status: ENUM_CONVERSATION_STATUS.OPEN,
                }),
            },
            streaming,
        });

        await service.fire({ ...baseData, followupId: 'f-1' });

        expect(streaming.deliver).not.toHaveBeenCalled();
        expect(rows[0]).toEqual(
            expect.objectContaining({
                status: ENUM_FOLLOWUP_STATUS.SKIPPED,
                outcomeReason: ENUM_FOLLOWUP_SKIP_REASON.BOT_DISABLED,
            })
        );
    });

    it('skips when the conversation is gone', async () => {
        const { service, rows } = makeService({
            rows: [followupRow({ id: 'f-1' })],
            conversationService: {
                findOneById: jest.fn().mockResolvedValue(null),
            },
            streaming: { deliver: jest.fn() },
        });

        await service.fire({ ...baseData, followupId: 'f-1' });

        expect(rows[0].outcomeReason).toBe(
            ENUM_FOLLOWUP_SKIP_REASON.CONVERSATION_MISSING
        );
    });

    it('skips when the provider account has no chatbot', async () => {
        const { service, rows } = makeService({
            rows: [followupRow({ id: 'f-1' })],
            conversationService: liveConversation,
            accountService: { findOne: jest.fn().mockResolvedValue(null) },
            streaming: { deliver: jest.fn() },
        });

        await service.fire({ ...baseData, followupId: 'f-1' });

        expect(rows[0].outcomeReason).toBe(
            ENUM_FOLLOWUP_SKIP_REASON.CHATBOT_MISSING
        );
    });

    it('does not deliver twice when Cloud Tasks retries an already-completed followup', async () => {
        const streaming = { deliver: jest.fn() };
        const { service } = makeService({
            rows: [
                followupRow({
                    id: 'f-1',
                    status: ENUM_FOLLOWUP_STATUS.COMPLETED,
                }),
            ],
            conversationService: liveConversation,
            streaming,
        });

        await service.fire({ ...baseData, followupId: 'f-1' });

        expect(streaming.deliver).not.toHaveBeenCalled();
    });

    it('retries delivery when Cloud Tasks re-runs a previously FAILED followup', async () => {
        const deliver = jest.fn().mockResolvedValue({ anySent: true });
        const { service, rows } = makeService({
            rows: [
                followupRow({
                    id: 'f-1',
                    status: ENUM_FOLLOWUP_STATUS.FAILED,
                    outcomeReason: 'AI unavailable',
                    attempts: 1,
                }),
            ],
            conversationService: liveConversation,
            accountService: liveAccount,
            registry: { get: jest.fn().mockReturnValue({}) },
            chatbotAIService: { streamChat: jest.fn().mockResolvedValue({}) },
            messageRepository: {
                findRecentByConversation: jest.fn().mockResolvedValue([]),
            },
            streaming: { deliver },
        });

        await service.fire({ ...baseData, followupId: 'f-1' });

        expect(deliver).toHaveBeenCalled();
        expect(rows[0]).toEqual(
            expect.objectContaining({
                status: ENUM_FOLLOWUP_STATUS.COMPLETED,
                attempts: 2,
            })
        );
    });

    it('rebuilds history from the DB (empty-thread fallback), delivers and records COMPLETED', async () => {
        const streamChat = jest.fn().mockResolvedValue({});
        const deliver = jest.fn().mockResolvedValue({ anySent: true });
        const findRecentByConversation = jest.fn().mockResolvedValue([
            { text: 'hi there', direction: ENUM_MESSAGE_DIRECTION.INBOUND },
            {
                text: 'how can I help?',
                direction: ENUM_MESSAGE_DIRECTION.OUTBOUND,
            },
        ]);
        const { service, rows } = makeService({
            rows: [followupRow({ id: 'f-1' })],
            conversationService: liveConversation,
            accountService: liveAccount,
            registry: {
                get: jest.fn().mockReturnValue({ sendMessage: jest.fn() }),
            },
            chatbotAIService: { streamChat },
            messageRepository: { findRecentByConversation },
            streaming: { deliver },
        });

        await service.fire({ ...baseData, followupId: 'f-1' });

        const params = streamChat.mock.calls[0][0];
        expect(params.message).toBe('check payment');
        expect(params.conversation_id).toBe('conv-1');
        expect(params.history).toEqual([
            { role: 'user', content: 'hi there' },
            { role: 'assistant', content: 'how can I help?' },
        ]);
        expect(deliver).toHaveBeenCalled();
        expect(rows[0]).toEqual(
            expect.objectContaining({
                status: ENUM_FOLLOWUP_STATUS.COMPLETED,
                firedAt: expect.any(Date),
                outcomeReason: null,
            })
        );
    });

    // Public build: no meter is wired, so the followup generates and delivers
    // instead of being skipped for an exhausted budget.
    it('delivers when no meter is wired', async () => {
        const deliver = jest.fn().mockResolvedValue({ anySent: true });
        const { service, rows } = makeService({
            meter: null,
            rows: [followupRow({ id: 'f-1' })],
            conversationService: liveConversation,
            accountService: liveAccount,
            registry: {
                get: jest.fn().mockReturnValue({ sendMessage: jest.fn() }),
            },
            chatbotAIService: { streamChat: jest.fn().mockResolvedValue({}) },
            messageRepository: {
                findRecentByConversation: jest.fn().mockResolvedValue([]),
            },
            streaming: { deliver },
        });

        await service.fire({ ...baseData, followupId: 'f-1' });

        expect(deliver).toHaveBeenCalled();
        expect(rows[0]).toEqual(
            expect.objectContaining({
                status: ENUM_FOLLOWUP_STATUS.COMPLETED,
                outcomeReason: null,
            })
        );
    });

    it('still fires when the task predates followup logging', async () => {
        const deliver = jest.fn().mockResolvedValue({ anySent: true });
        const { service } = makeService({
            conversationService: liveConversation,
            accountService: liveAccount,
            registry: { get: jest.fn().mockReturnValue({}) },
            chatbotAIService: { streamChat: jest.fn().mockResolvedValue({}) },
            messageRepository: {
                findRecentByConversation: jest.fn().mockResolvedValue([]),
            },
            streaming: { deliver },
        });

        await expect(service.fire(baseData)).resolves.toBeUndefined();
        expect(deliver).toHaveBeenCalled();
    });

    it('records FAILED and rethrows an AI stream acquisition failure for Cloud Tasks retry', async () => {
        const error = new Error('AI unavailable');
        const { service, rows } = makeService({
            rows: [followupRow({ id: 'f-1' })],
            conversationService: liveConversation,
            accountService: liveAccount,
            registry: { get: jest.fn().mockReturnValue({}) },
            chatbotAIService: {
                streamChat: jest.fn().mockRejectedValue(error),
            },
            messageRepository: {
                findRecentByConversation: jest.fn().mockResolvedValue([]),
            },
            streaming: { deliver: jest.fn() },
        });

        await expect(
            service.fire({ ...baseData, followupId: 'f-1' })
        ).rejects.toBe(error);
        expect(rows[0]).toEqual(
            expect.objectContaining({
                status: ENUM_FOLLOWUP_STATUS.FAILED,
                outcomeReason: 'AI unavailable',
            })
        );
    });

    it('rethrows a generation failure reported before delivery', async () => {
        const { service } = makeService({
            rows: [followupRow({ id: 'f-1' })],
            conversationService: liveConversation,
            accountService: liveAccount,
            registry: { get: jest.fn().mockReturnValue({}) },
            chatbotAIService: { streamChat: jest.fn().mockResolvedValue({}) },
            messageRepository: {
                findRecentByConversation: jest.fn().mockResolvedValue([]),
            },
            streaming: {
                deliver: jest.fn().mockResolvedValue({
                    anySent: false,
                    generationFailed: true,
                }),
            },
        });

        await expect(
            service.fire({ ...baseData, followupId: 'f-1' })
        ).rejects.toThrow('Followup AI generation failed');
    });

    it('does not retry a delivery failure after an outbound segment is persisted', async () => {
        const deliver = jest.fn(async ({ onSegmentPersist }: any) => {
            await onSegmentPersist('first segment');
            throw new Error('delivery failed after persistence');
        });
        const { service, rows } = makeService({
            rows: [followupRow({ id: 'f-1' })],
            conversationService: liveConversation,
            accountService: liveAccount,
            registry: { get: jest.fn().mockReturnValue({}) },
            chatbotAIService: { streamChat: jest.fn().mockResolvedValue({}) },
            messageRepository: {
                findRecentByConversation: jest.fn().mockResolvedValue([]),
                insertPendingOutbound: jest.fn().mockResolvedValue(undefined),
            },
            streaming: { deliver },
        });

        await expect(
            service.fire({ ...baseData, followupId: 'f-1' })
        ).resolves.toBeUndefined();
        expect(deliver).toHaveBeenCalledTimes(1);
        expect(rows[0].status).toBe(ENUM_FOLLOWUP_STATUS.FAILED);
    });

    it('truncates a long error message to fit outcome_reason', async () => {
        const { service, rows } = makeService({
            rows: [followupRow({ id: 'f-1' })],
            conversationService: liveConversation,
            accountService: liveAccount,
            registry: { get: jest.fn().mockReturnValue({}) },
            chatbotAIService: {
                streamChat: jest
                    .fn()
                    .mockRejectedValue(new Error('x'.repeat(400))),
            },
            messageRepository: {
                findRecentByConversation: jest.fn().mockResolvedValue([]),
            },
            streaming: { deliver: jest.fn() },
        });

        await expect(
            service.fire({ ...baseData, followupId: 'f-1' })
        ).rejects.toThrow();
        expect(rows[0].outcomeReason).toHaveLength(255);
    });
});
