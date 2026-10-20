import { AI_STREAM_IDLE_TIMEOUT_MS } from 'src/modules/chatbot/constants/chatbot-ai.constant';
import {
    AIChatHistoryMessage,
    ChatbotAIService,
} from 'src/modules/chatbot/services/chatbot-ai.service';
import { ChatbotTimezoneService } from 'src/modules/chatbot/services/chatbot-timezone.service';

jest.mock('@app/common/utils/gcp-id-token.util', () => ({
    getInternalAuthHeader: jest
        .fn()
        .mockResolvedValue({ Authorization: 'Bearer gcp-id-token' }),
}));

describe('ChatbotAIService', () => {
    let service: ChatbotAIService;
    const post = jest.fn();
    const del = jest.fn();
    const configService = {
        get: jest.fn((key: string) =>
            key === 'ai.internalToken' ? 'internal-token' : 'http://ai:8000'
        ),
    };

    beforeEach(() => {
        jest.clearAllMocks();
        configService.get.mockImplementation((key: string) =>
            key === 'ai.internalToken' ? 'internal-token' : 'http://ai:8000'
        );
        service = new ChatbotAIService(
            { axiosRef: { post, delete: del } } as any,
            configService as any,
            new ChatbotTimezoneService({
                get: () => 'Asia/Ho_Chi_Minh',
            } as any)
        );
    });

    it('sends both the GCP ID token and the internal token header on streamChat', async () => {
        post.mockResolvedValue({ data: {} });

        await service.streamChat({ zones: { chatbot: {} } } as any);

        expect(post).toHaveBeenCalledWith(
            'http://ai:8000/api/chat/stream',
            expect.anything(),
            expect.objectContaining({
                headers: {
                    Authorization: 'Bearer gcp-id-token',
                    'X-Internal-Token': 'internal-token',
                },
            })
        );
    });

    // #87: apps/ai binds X-Request-ID to its logs and Sentry scope, so one
    // conversation can be followed across both services.
    it('sends the conversation id as X-Request-ID on streamChat', async () => {
        post.mockResolvedValue({ data: {} });

        await service.streamChat({
            conversation_id: 'conv-1',
            zones: { chatbot: {} },
        } as any);

        expect(post.mock.calls[0][2].headers).toMatchObject({
            'X-Request-ID': 'conv-1',
        });
    });

    // The module-wide 60s axios timeout is a socket idle timer that stays
    // armed while the reply streams, so a slow tool roundtrip aborted it.
    it('gives the reply stream its own idle timeout, longer than the 60s default', async () => {
        post.mockResolvedValue({ data: {} });

        await service.streamChat({ zones: { chatbot: {} } } as any);

        expect(post.mock.calls[0][2]).toMatchObject({
            timeout: AI_STREAM_IDLE_TIMEOUT_MS,
        });
        expect(AI_STREAM_IDLE_TIMEOUT_MS).toBeGreaterThan(60_000);
    });

    // #292: apps/ai gets the zones resolved, never the raw stored values.
    it('sends the resolved business and customer timezones', async () => {
        post.mockResolvedValue({ data: {} });

        await service.streamChat({
            chatbot_id: 'bot-1',
            zones: {
                chatbot: { timezone: null },
                conversation: { timezone: 'America/New_York' },
            },
        } as any);

        expect(post.mock.calls[0][1]).toEqual({
            chatbot_id: 'bot-1',
            agent_timezone: 'Asia/Ho_Chi_Minh',
            customer_timezone: 'America/New_York',
        });
    });

    it('sends both the GCP ID token and the internal token header on deleteSession', async () => {
        del.mockResolvedValue({});

        await service.deleteSession('session-1');

        expect(del).toHaveBeenCalledWith(
            'http://ai:8000/api/chat/session/session-1',
            {
                headers: {
                    Authorization: 'Bearer gcp-id-token',
                    'X-Internal-Token': 'internal-token',
                },
            }
        );
    });

    // Compile-time contract (checked by tsc): apps/ai rejects a 'system'
    // history role, so the type must not allow sending one.
    it('types history roles as user | assistant only', () => {
        const roles: AIChatHistoryMessage['role'][] = ['user', 'assistant'];
        // @ts-expect-error 'system' is not a valid history role
        const system: AIChatHistoryMessage['role'] = 'system';

        expect(roles).not.toContain(system);
    });
});
