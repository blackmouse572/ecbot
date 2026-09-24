import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
    EMPTY_SUGGESTION,
    buildSuggestQuestions,
    readSuggestAnswers,
    type AgentSuggestion,
} from '@repo/agent-blueprint';
import { Cache } from 'cache-manager';
import { createHash } from 'crypto';
import { AiDecisionService } from './ai-decision.service';

@Injectable()
export class AgentBuilderService {
    private readonly logger = new Logger(AgentBuilderService.name);

    constructor(
        private readonly aiDecision: AiDecisionService,
        @Inject(CACHE_MANAGER) private readonly cache: Cache,
        private readonly config: ConfigService
    ) {}

    static cacheKey(description: string): string {
        const normalised = description.trim().toLowerCase().replace(/\s+/g, ' ');
        const hash = createHash('sha256').update(normalised).digest('hex');
        return `agent-builder:suggest:v1:${hash}`;
    }

    // Never throws: the builder works without suggestions.
    async suggest(description: string): Promise<AgentSuggestion> {
        const state = description.trim();
        const key = AgentBuilderService.cacheKey(state);
        try {
            const cached = await this.cache.get<AgentSuggestion>(key);
            if (cached) return cached;

            const answers = await this.aiDecision.systemOne(state, buildSuggestQuestions());
            const suggestion = readSuggestAnswers(answers);
            await this.cache.set(key, suggestion, this.config.get<number>('agentBuilder.suggestTtlMs'));
            return suggestion;
        } catch (error) {
            this.logger.warn(`agent builder suggest failed: ${(error as Error).message}`);
            return EMPTY_SUGGESTION;
        }
    }
}
