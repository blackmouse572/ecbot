import { ENUM_AI_USAGE_SOURCE } from '@app/app/ai-usage-meter.interface';
import {
    CONVERSATION_MEMORY_MAX_ATTEMPTS,
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
    summary = 'Wants 2 red shirts.'
) {
    const conversationRepository = {
        findOneById: jest.fn(async () => conversation),
        updateEntity: jest.fn(async () => ({})),
    };
    const messageRepository = {
        afterCursorFilter: jest.fn(async () => ({ after: 1 })),
        untilFilter: jest.fn(async () => ({ until: 1 })),
        findNewest: jest.fn(async () => [
            {
                direction: 'INBOUND',
                authorType: 'USER',
                text: '2 cái size M',
                attachments: [],
            },
            {
                direction: 'OUTBOUND',
                authorType: 'BOT',
                text: 'Dạ',
                attachments: [],
            },
            {
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
            { after: 1 },
            'm-19'
        );
        expect(ai.summarizeConversation).toHaveBeenCalledWith({
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
