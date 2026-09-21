import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';
import { firstValueFrom } from 'rxjs';
import { ChatbotModelResponseDto } from '../dtos/response/chatbot.model.response.dto';

const OPENROUTER_MODELS_URL = 'https://openrouter.ai/api/v1/models';
const TTL_MS = 60 * 60 * 1000;

interface CacheEntry {
    at: number;
    data: ChatbotModelResponseDto[];
}

@Injectable()
export class ChatbotModelCatalogService {
    private cache: CacheEntry | null = null;

    constructor(private readonly httpService: HttpService) {}

    async list(): Promise<ChatbotModelResponseDto[]> {
        if (this.cache && Date.now() - this.cache.at < TTL_MS) {
            return this.cache.data;
        }
        try {
            const res = await firstValueFrom(
                this.httpService.get(OPENROUTER_MODELS_URL, {
                    params: {
                        supported_parameters: 'tools',
                        input_modalities: 'text',
                        output_modalities: 'text',
                    },
                })
            );
            const models = (res.data?.data ?? [])
                .filter((m: any) => this.fits(m))
                .map((m: any) => this.map(m));
            this.cache = { at: Date.now(), data: models };
            return models;
        } catch (e) {
            if (this.cache) return this.cache.data; // serve last-good
            throw e;
        }
    }

    private fits(m: any): boolean {
        const a = m.architecture ?? {};
        return (
            Array.isArray(m.supported_parameters) &&
            m.supported_parameters.includes('tools') &&
            (a.input_modalities ?? []).includes('text') &&
            (a.output_modalities ?? []).includes('text')
        );
    }

    private map(m: any): ChatbotModelResponseDto {
        return {
            id: m.id,
            name: m.name ?? m.id,
            provider: String(m.id).split('/')[0],
            contextLength: m.context_length ?? null,
            description: m.description ?? undefined,
        };
    }
}
