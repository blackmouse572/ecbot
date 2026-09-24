import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { SystemOneAnswer, SystemOneQuestion } from '@repo/agent-blueprint';
import { firstValueFrom } from 'rxjs';

// apps/ai answers System One-shaped questions with the model in DECISION_MODEL.
@Injectable()
export class AiDecisionService {
    private readonly baseUrl: string;
    private readonly internalToken: string;

    constructor(
        private readonly http: HttpService,
        private readonly config: ConfigService
    ) {
        this.baseUrl = this.config.get<string>('ai.backend.url') ?? 'http://localhost:8000';
        this.internalToken = process.env.API_INTERNAL_TOKEN ?? '';
    }

    async systemOne(
        state: string,
        questions: Record<string, SystemOneQuestion>
    ): Promise<Record<string, SystemOneAnswer>> {
        const resp = await firstValueFrom(
            this.http.post(
                `${this.baseUrl}/api/decision/system-one`,
                { state, questions },
                {
                    timeout: this.config.get<number>('agentBuilder.decisionTimeoutMs') ?? 15000,
                    headers: {
                        Authorization: `Bearer ${this.internalToken}`,
                        'Content-Type': 'application/json',
                    },
                }
            )
        );
        const payload = resp.data as { data?: { answers?: Record<string, SystemOneAnswer> } };
        return payload?.data?.answers ?? {};
    }
}
