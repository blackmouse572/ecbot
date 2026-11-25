import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject, Injectable, Logger, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
    EMPTY_SUGGESTION,
    buildExtractFields,
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
import { TokenUsageDelta } from 'src/modules/chatbot/interfaces/token-usage-wire.interface';
import { createHash } from 'crypto';
import { AiDecisionService, type IAiExtractResult, type ISystemOneResult } from './ai-decision.service';

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

            const [decision, extracted] = await Promise.all([
                // The two calls fail independently: if the decisions call dies
                // after the extraction was sent, its tokens are still spent and
                // must be metered.
                this.aiDecision.decide(state, buildSuggestQuestions()).catch(
                    (error: unknown): ISystemOneResult | null => {
                        this.logger.warn(
                            `agent builder decision failed: ${(error as Error).message}`
                        );
                        return null;
                    }
                ),
                // Decisions models cannot write text; only losing the texts is
                // acceptable, so a failed extraction keeps the rest.
                this.aiDecision.extract(state, buildExtractFields()).catch(
                    (error: unknown): IAiExtractResult => {
                        this.logger.warn(
                            `agent builder text extraction failed: ${(error as Error).message}`
                        );
                        return { answers: {}, usage: null };
                    }
                ),
            ]);
            // Meter each call with its own model: the two models price
            // differently, so one summed row would bill the wrong rate.
            await Promise.all([
                this.recordUsage(workspaceId, decision?.usage ?? null, decision?.model),
                this.recordUsage(workspaceId, extracted.usage, extracted.model),
            ]);
            if (!decision) return EMPTY_SUGGESTION;
            const suggestion = readSuggestAnswers(decision.answers, extracted.answers);
            // apps/ai answers `{}` on any failure: never cache that for 24h.
            // A failed or empty extraction has no prefilled details either, so
            // caching it would hide the business name/hours until the TTL ends.
            const empty = !decision.answers || Object.keys(decision.answers).length === 0;
            const missingTexts = Object.keys(suggestion.texts).length === 0;
            if (empty || missingTexts || suggestion.businessType === null) return suggestion;
            await this.cache.set(key, suggestion, this.config.get<number>('agentBuilder.suggestTtlMs'));
            return suggestion;
        } catch (error) {
            this.logger.warn(`agent builder suggest failed: ${(error as Error).message}`);
            return EMPTY_SUGGESTION;
        }
    }

    /** One meter row per model call; `usage` is null when apps/ai reported none. */
    private async recordUsage(
        workspaceId: string,
        usage: TokenUsageDelta | null,
        model?: string
    ): Promise<void> {
        if (!usage) return;
        await this.meter
            ?.record({
                workspaceId,
                usage,
                source: ENUM_AI_USAGE_SOURCE.AGENT_BUILDER,
                model,
            })
            .catch((err: unknown) => this.logger.warn(`agent builder usage not recorded: ${err}`));
    }
}
