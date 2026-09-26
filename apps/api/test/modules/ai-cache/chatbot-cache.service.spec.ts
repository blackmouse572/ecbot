import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { ChatbotCacheService } from 'src/modules/ai-cache/services/chatbot-cache.service';

jest.mock('@app/common/utils/gcp-id-token.util', () => ({
    getInternalAuthHeader: jest.fn().mockResolvedValue({}),
}));

describe('ChatbotCacheService', () => {
    let service: ChatbotCacheService;
    const del = jest.fn();

    beforeEach(async () => {
        jest.clearAllMocks();
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                ChatbotCacheService,
                {
                    provide: HttpService,
                    useValue: { axiosRef: { delete: del } },
                },
                {
                    provide: ConfigService,
                    useValue: {
                        get: (key: string) =>
                            key === 'ai.internalToken'
                                ? 'internal-token'
                                : 'http://ai:8000',
                    },
                },
            ],
        }).compile();
        service = module.get(ChatbotCacheService);
    });

    it('calls the apps/ai invalidation endpoint with the internal token header', async () => {
        del.mockResolvedValue({});
        await service.invalidate('cb-1');
        expect(del).toHaveBeenCalledWith(
            'http://ai:8000/api/chat/chatbot-cache/cb-1',
            { headers: { 'X-Internal-Token': 'internal-token' } }
        );
    });

    it('swallows transport failures so the triggering write still succeeds', async () => {
        del.mockRejectedValue(new Error('ai down'));
        await expect(service.invalidate('cb-1')).resolves.toBeUndefined();
    });
});
