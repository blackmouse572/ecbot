import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { getInternalTokenHeader } from '@app/common/utils/ai-internal-headers.util';
import { getInternalAuthHeader } from '@app/common/utils/gcp-id-token.util';
import { parseWireTokenUsage, TokenUsageDelta } from '@app/modules/chatbot/interfaces/token-usage-wire.interface';
import type { SystemOneAnswer, SystemOneQuestion } from '@repo/agent-blueprint';
import { firstValueFrom } from 'rxjs';

export interface ISystemOneResult {
    answers: Record<string, SystemOneAnswer>;
    /** What the call spent; null when apps/ai reported nothing. */
    usage: TokenUsageDelta | null;
    model?: string;
}

// apps/ai answers System One-shaped questions with the model in DECISION_MODEL.
@Injectable()
export class AiDecisionService {
    private readonly baseUrl: string;

    constructor(
        private readonly http: HttpService,
        private readonly config: ConfigService
    ) {
        this.baseUrl = this.config.get<string>('ai.backend.url') ?? 'http://localhost:8000';
    }

    async systemOne(
        state: string,
        questions: Record<string, SystemOneQuestion>,
        timeoutMs?: number
    ): Promise<Record<string, SystemOneAnswer>> {
        return (await this.decide(state, questions, timeoutMs)).answers;
    }

    /** Wakes apps/ai (it scales to zero) so the next decision skips its cold start. */
    async warm(): Promise<void> {
        const authHeaders = await getInternalAuthHeader(this.baseUrl);
        await firstValueFrom(
            this.http.get(`${this.baseUrl}/health`, {
                timeout: this.config.get<number>('agentBuilder.warmTimeoutMs'),
                headers: { ...authHeaders, ...getInternalTokenHeader(this.config) },
            })
        );
    }

    /** `systemOne`, plus what the call spent, for callers that meter it. */
    async decide(
        state: string,
        questions: Record<string, SystemOneQuestion>,
        timeoutMs?: number
    ): Promise<ISystemOneResult> {
        const authHeaders = await getInternalAuthHeader(this.baseUrl);
        const resp = await firstValueFrom(
            this.http.post(
                `${this.baseUrl}/api/decision/system-one`,
                { state, questions },
                {
                    timeout: timeoutMs ?? this.config.get<number>('agentBuilder.decisionTimeoutMs') ?? 15000,
                    headers: {
                        ...authHeaders,
                        ...getInternalTokenHeader(this.config),
                        'Content-Type': 'application/json',
                    },
                }
            )
        );
        const payload = resp.data as {
            data?: { answers?: Record<string, SystemOneAnswer>; usage?: unknown; model?: string };
        };
        return {
            answers: payload?.data?.answers ?? {},
            usage: parseWireTokenUsage(payload?.data?.usage),
            model: payload?.data?.model,
        };
    }
}
