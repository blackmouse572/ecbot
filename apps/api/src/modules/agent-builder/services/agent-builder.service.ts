import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject, Injectable, Logger, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
    EMPTY_SUGGESTION,
    buildSuggestQuestions,
    readSuggestAnswers,
    type AgentSuggestion,
} from '@repo/agent-blueprint';
import { Cache } from 'cache-manager';
import {
    AI_USAGE_METER,
    AiUsageMeter,
    ENUM_AI_USAGE_SOURCE,
} from 'src/app/ai-usage-meter.interface';
import { createHash } from 'crypto';
import { AiDecisionService } from './ai-decision.service';

@Injectable()
export class AgentBuilderService {
    private readonly logger = new Logger(AgentBuilderService.name);

    constructor(
        private readonly aiDecision: AiDecisionService,
        @Inject(CACHE_MANAGER) private readonly cache: Cache,
        private readonly config: ConfigService,
        @Optional()
        @Inject(AI_USAGE_METER)
        private readonly meter?: AiUsageMeter
    ) {}

    static cacheKey(description: string): string {
        const normalised = description.trim().toLowerCase().replace(/\s+/g, ' ');
        const hash = createHash('sha256').update(normalised).digest('hex');
        return `agent-builder:suggest:v2:${hash}`;
    }

    // Never throws: waking apps/ai only saves the owner a wait (#256).
    async warm(): Promise<void> {
        try {
            await this.aiDecision.warm();
        } catch (error) {
            this.logger.warn(`agent builder warm-up failed: ${(error as Error).message}`);
        }
    }

    // Never throws: the builder works without suggestions, so a workspace out
    // of tokens gets none rather than an error.
    async suggest(workspaceId: string, description: string): Promise<AgentSuggestion> {
        const state = description.trim();
        const key = AgentBuilderService.cacheKey(state);
        try {
            const cached = await this.cache.get<AgentSuggestion>(key);
            if (cached) return cached;

            // No meter is the public build: allowed, and nothing recorded below.
            const budget = (await this.meter?.check(workspaceId)) ?? { allowed: true };
            if (!budget.allowed) return EMPTY_SUGGESTION;

            const { answers, usage, model } = await this.aiDecision.decide(state, buildSuggestQuestions());
            if (usage) {
                await this.meter?.record({
                    workspaceId,
                    usage,
                    source: ENUM_AI_USAGE_SOURCE.AGENT_BUILDER,
                    model,
                }).catch((err: unknown) => this.logger.warn(`agent builder usage not recorded: ${err}`));
            }
            const suggestion = readSuggestAnswers(answers);
            // apps/ai answers `{}` on any failure: never cache that for 24h.
            const empty = !answers || Object.keys(answers).length === 0;
            if (empty || suggestion.businessType === null) return suggestion;
            await this.cache.set(key, suggestion, this.config.get<number>('agentBuilder.suggestTtlMs'));
            return suggestion;
        } catch (error) {
            this.logger.warn(`agent builder suggest failed: ${(error as Error).message}`);
            return EMPTY_SUGGESTION;
        }
    }
}
