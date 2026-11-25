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

export interface IAiWriteResult {
    /** The drafted text; empty when apps/ai could not write one. */
    text: string;
    usage: TokenUsageDelta | null;
    model?: string;
}

export interface IAiExtractResult {
    /** The detail copied for each field id; empty when apps/ai could not read them. */
    answers: Record<string, string>;
    usage: TokenUsageDelta | null;
    model?: string;
}

// apps/ai answers System One-shaped questions with the decisions model in
// DECISION_MODEL; text details come from its own chat-model call.
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

    /** One POST to apps/ai: auth headers, timeout fallback and the `data` unwrap. */
    private async post<T>(
        path: string,
        body: Record<string, unknown>,
        timeoutMs?: number
    ): Promise<{ data?: T; usage: TokenUsageDelta | null; model?: string }> {
        const authHeaders = await getInternalAuthHeader(this.baseUrl);
        const resp = await firstValueFrom(
            this.http.post(`${this.baseUrl}${path}`, body, {
                timeout: timeoutMs ?? this.config.get<number>('agentBuilder.decisionTimeoutMs') ?? 15000,
                headers: {
                    ...authHeaders,
                    ...getInternalTokenHeader(this.config),
                    'Content-Type': 'application/json',
                },
            })
        );
        const payload = resp.data as {
            data?: T & { usage?: unknown; model?: string };
        };
        return {
            data: payload?.data,
            usage: parseWireTokenUsage(payload?.data?.usage),
            model: payload?.data?.model,
        };
    }

    /** `systemOne`, plus what the call spent, for callers that meter it. */
    async decide(
        state: string,
        questions: Record<string, SystemOneQuestion>,
        timeoutMs?: number
    ): Promise<ISystemOneResult> {
        const { data, usage, model } = await this.post<{
            answers?: Record<string, SystemOneAnswer>;
        }>('/api/decision/system-one', { state, questions }, timeoutMs);
        return { answers: data?.answers ?? {}, usage, model };
    }

    /** Copies stated details out of a state (`apps/ai /api/decision/extract`). */
    async extract(
        state: string,
        fields: Record<string, string>,
        timeoutMs?: number
    ): Promise<IAiExtractResult> {
        const { data, usage, model } = await this.post<{
            answers?: Record<string, string>;
        }>('/api/decision/extract', { state, fields }, timeoutMs);
        return { answers: data?.answers ?? {}, usage, model };
    }

    /** Drafts a short text from instructions and a state (`apps/ai /api/decision/write`). */
    async write(instructions: string, state: string, timeoutMs?: number): Promise<IAiWriteResult> {
        const { data, usage, model } = await this.post<{ text?: string }>(
            '/api/decision/write',
            { instructions, state },
            timeoutMs
        );
        return { text: data?.text ?? '', usage, model };
    }
}
