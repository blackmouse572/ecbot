import { HttpService } from '@nestjs/axios';
import { of } from 'rxjs';
import { ChatbotModelCatalogService } from '../../../../src/modules/chatbot/services/chatbot-model-catalog.service';

const raw = (over = {}) => ({
    id: 'anthropic/claude-sonnet-4.5',
    name: 'Claude Sonnet 4.5',
    description: 'x',
    context_length: 200000,
    architecture: { input_modalities: ['text'], output_modalities: ['text'] },
    supported_parameters: ['tools', 'temperature'],
    ...over,
});

describe('ChatbotModelCatalogService', () => {
    const makeSvc = (models: any[]) => {
        const http = {
            get: jest.fn().mockReturnValue(of({ data: { data: models } })),
        } as unknown as HttpService;
        return { svc: new ChatbotModelCatalogService(http), http };
    };

    it('maps and derives provider', async () => {
        const { svc } = makeSvc([raw()]);
        const out = await svc.list();
        expect(out[0]).toEqual({
            id: 'anthropic/claude-sonnet-4.5',
            name: 'Claude Sonnet 4.5',
            provider: 'anthropic',
            contextLength: 200000,
            description: 'x',
        });
    });

    it('drops models without tools or text io', async () => {
        const { svc } = makeSvc([
            raw({ id: 'a/no-tools', supported_parameters: ['temperature'] }),
            raw({
                id: 'a/img-out',
                architecture: {
                    input_modalities: ['text'],
                    output_modalities: ['image'],
                },
            }),
        ]);
        expect(await svc.list()).toHaveLength(0);
    });

    it('caches within TTL (one upstream call)', async () => {
        const { svc, http } = makeSvc([raw()]);
        await svc.list();
        await svc.list();
        expect(http.get as jest.Mock).toHaveBeenCalledTimes(1);
    });
});
