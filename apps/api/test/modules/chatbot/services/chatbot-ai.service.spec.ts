import { ChatbotAIService } from 'src/modules/chatbot/services/chatbot-ai.service';

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
            configService as any
        );
    });

    it('sends both the GCP ID token and the internal token header on streamChat', async () => {
        post.mockResolvedValue({ data: {} });

        await service.streamChat({} as any);

        expect(post).toHaveBeenCalledWith(
            'http://ai:8000/api/chat/stream',
            {},
            expect.objectContaining({
                headers: {
                    Authorization: 'Bearer gcp-id-token',
                    'X-Internal-Token': 'internal-token',
                },
            })
        );
    });

    it('sends both the GCP ID token and the internal token header on deleteSession', async () => {
        del.mockResolvedValue({});

        await service.deleteSession('session-1');

        expect(del).toHaveBeenCalledWith('http://ai:8000/api/chat/session/session-1', {
            headers: {
                Authorization: 'Bearer gcp-id-token',
                'X-Internal-Token': 'internal-token',
            },
        });
    });
});
