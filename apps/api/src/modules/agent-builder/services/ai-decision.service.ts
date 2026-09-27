import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { getInternalAuthHeader } from '@app/common/utils/gcp-id-token.util';
import type { SystemOneAnswer, SystemOneQuestion } from '@repo/agent-blueprint';
import { firstValueFrom } from 'rxjs';

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
        questions: Record<string, SystemOneQuestion>
    ): Promise<Record<string, SystemOneAnswer>> {
        const authHeaders = await getInternalAuthHeader(this.baseUrl);
        const resp = await firstValueFrom(
            this.http.post(
                `${this.baseUrl}/api/decision/system-one`,
                { state, questions },
                {
                    timeout: this.config.get<number>('agentBuilder.decisionTimeoutMs') ?? 15000,
                    headers: {
                        ...authHeaders,
                        'Content-Type': 'application/json',
                    },
                }
            )
        );
        const payload = resp.data as { data?: { answers?: Record<string, SystemOneAnswer> } };
        return payload?.data?.answers ?? {};
    }
}
