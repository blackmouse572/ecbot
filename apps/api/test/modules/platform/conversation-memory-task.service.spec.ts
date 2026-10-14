import { ENUM_AI_USAGE_SOURCE } from '@app/app/ai-usage-meter.interface';
import {
    CONVERSATION_MEMORY_MAX_ATTEMPTS,
    CONVERSATION_MEMORY_SUMMARIZE_MAX_MESSAGES,
    ENUM_CONVERSATION_MEMORY_PROCESS,
} from '@app/modules/platform/constants/conversation-memory.constant';
import { ConversationMemoryTaskService } from '@app/modules/platform/services/conversation-memory-task.service';

const USAGE = { inputTokens: 500, outputTokens: 80, totalTokens: 580 };
const DTO = {
    jobName: ENUM_CONVERSATION_MEMORY_PROCESS.SUMMARIZE,
    conversationId: 'c',
    fromMessageId: 'cur',
    untilMessageId: 'm-19',
};

function taskOver(
    conversation: object | null,
    summary = 'Wants 2 red shirts.',
    blocked = false
) {
    const conversationRepository = {
        findOneById: jest.fn(async () => conversation),
        updateEntity: jest.fn(async () => ({})),
    };
    const messageRepository = {
        afterCursorFilter: jest.fn(async () => ({ after: 1 })),
        untilFilter: jest.fn(async () => ({ until: 1 })),
        findOldest: jest.fn(async (): Promise<object[]> => [
            {
                id: 'm-17',
                direction: 'INBOUND',
                authorType: 'USER',
                text: '2 cái size M',
                attachments: [],
            },
            {
                id: 'm-18',
                direction: 'OUTBOUND',
                authorType: 'BOT',
                text: 'Dạ',
                attachments: [],
            },
            {
                id: 'm-19',
                direction: 'OUTBOUND',
                authorType: 'OPERATOR',
                text: '',
                attachments: [],
            },
        ]),
    };
    const ai = {
        summarizeConversation: jest.fn(async () => ({
            summary,
            blocked,
            usage: USAGE,
            model: 'm',
        })),
    };
    const meter = {
        check: jest.fn(async () => ({ allowed: true })),
        record: jest.fn(async () => undefined),
    };
    const service = new ConversationMemoryTaskService(
        conversationRepository as any,
        messageRepository as any,
        ai as any,
        meter as any
    );
    return { service, conversationRepository, messageRepository, ai, meter };
}

const CONVERSATION = {
    id: 'c',
    memorySummary: 'Asked about shirts.',
    memorySummaryUntilId: 'cur',
    chatbot: { id: 'bot', workspace: { id: 'ws' } },
};

describe('ConversationMemoryTaskService', () => {
    it('folds the dropped messages into the summary and moves its cursor', async () => {
        const {
            service,
            ai,
            conversationRepository,
            messageRepository,
            meter,
        } = taskOver(CONVERSATION);

        await service.handle(DTO, 0);

        expect(messageRepository.afterCursorFilter).toHaveBeenCalledWith(
            'c',
            'cur'
        );
        expect(messageRepository.untilFilter).toHaveBeenCalledWith(
            'c',
            { after: 1 },
            'm-19'
        );
        expect(messageRepository.findOldest).toHaveBeenCalledWith(
            { until: 1 },
            CONVERSATION_MEMORY_SUMMARIZE_MAX_MESSAGES
        );
        expect(ai.summarizeConversation).toHaveBeenCalledWith({
            chatbot_id: 'bot',
            previous_summary: 'Asked about shirts.',
            messages: [
                { role: 'customer', text: '2 cái size M' },
                { role: 'bot', text: 'Dạ' },
            ],
        });
        expect(meter.record).toHaveBeenCalledWith(
            expect.objectContaining({
                workspaceId: 'ws',
                usage: USAGE,
                source: ENUM_AI_USAGE_SOURCE.CONVERSATION_MEMORY,
            })
        );
        // Only if no other run moved the cursor meanwhile.
        expect(conversationRepository.updateEntity).toHaveBeenCalledWith(
            { id: 'c', memorySummaryUntilId: 'cur' },
            {
                memorySummary: 'Wants 2 red shirts.',
                memorySummaryUntilId: 'm-19',
            }
        );
    });

    it('folds an oversized range from its oldest end and stops the cursor there', async () => {
        const { service, messageRepository, conversationRepository } =
            taskOver(CONVERSATION);
        const rows = Array.from(
            { length: CONVERSATION_MEMORY_SUMMARIZE_MAX_MESSAGES },
            (_, i) => ({
                id: `m-${i}`,
                direction: 'INBOUND',
                authorType: 'USER',
                text: `msg ${i}`,
                attachments: [],
            })
        );
        messageRepository.findOldest.mockResolvedValue(rows);

        await service.handle({ ...DTO, untilMessageId: 'm-250' }, 0);

        // The rest stays after the cursor; the next Turn queues it.
        expect(conversationRepository.updateEntity).toHaveBeenCalledWith(
            { id: 'c', memorySummaryUntilId: 'cur' },
            expect.objectContaining({
                memorySummaryUntilId: `m-${CONVERSATION_MEMORY_SUMMARIZE_MAX_MESSAGES - 1}`,
            })
        );
    });

    it('keeps the old summary but moves past messages the guardrail blocks', async () => {
        const { service, conversationRepository } = taskOver(
            CONVERSATION,
            '',
            true
        );

        await service.handle(DTO, 0);

        expect(conversationRepository.updateEntity).toHaveBeenCalledWith(
            { id: 'c', memorySummaryUntilId: 'cur' },
            {
                memorySummary: 'Asked about shirts.',
                memorySummaryUntilId: 'm-19',
            }
        );
    });

    it('skips a job whose cursor has moved on', async () => {
        const { service, ai } = taskOver({
            ...CONVERSATION,
            memorySummaryUntilId: 'later',
        });

        await service.handle(DTO, 0);

        expect(ai.summarizeConversation).not.toHaveBeenCalled();
    });

    it('skips a workspace out of tokens', async () => {
        const { service, ai, meter } = taskOver(CONVERSATION);
        meter.check.mockResolvedValue({ allowed: false });

        await service.handle(DTO, 0);

        expect(ai.summarizeConversation).not.toHaveBeenCalled();
    });

    it('retries an empty summary, then gives up on the last attempt', async () => {
        const { service, conversationRepository } = taskOver(CONVERSATION, '');

        await expect(service.handle(DTO, 0)).rejects.toThrow();
        await expect(
            service.handle(DTO, CONVERSATION_MEMORY_MAX_ATTEMPTS - 1)
        ).resolves.toBeUndefined();
        expect(conversationRepository.updateEntity).not.toHaveBeenCalled();
    });
});
