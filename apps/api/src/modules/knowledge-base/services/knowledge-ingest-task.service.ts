import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as Sentry from '@sentry/nestjs';
import { firstValueFrom } from 'rxjs';
import FormData from 'form-data';
import { AwsS3Service } from '@app/modules/aws/services/aws.s3.service';
import { getInternalAuthHeader } from '@app/common/utils/gcp-id-token.util';
import { getInternalTokenHeader } from '@app/common/utils/ai-internal-headers.util';
import { ENUM_AWS_S3_ACCESSIBILITY } from '@app/modules/aws/enums/aws.enum';
import { ENUM_KNOWLEDGE_BASE_ITEM_STATUS } from '../enums/knowledge-base-item-status.enum';
import { ENUM_KNOWLEDGE_BASE_ITEM_TYPE } from '../enums/knowledge-base-item-type.enum';
import {
    ENUM_RAG_INGEST_PROCESS,
    RAG_INGEST_HTTP_TIMEOUT_MS,
    RAG_INGEST_MAX_ATTEMPTS,
    RAG_INGEST_SENTRY_QUEUE,
} from '../constants/knowledge-ingest.constant';
import { KnowledgeIngestTaskDto } from '../dtos/knowledge-ingest.task.dto';
import { KnowledgeItemService } from './knowledge-item.service';
import { ChatbotKnowledgeItemService } from './chatbot-knowledge-item.service';

export function classifyIngestError(err: any): 'permanent' | 'transient' {
    const status = err?.response?.status;
    if (typeof status === 'number') {
        if (status === 408 || status === 429) return 'transient';
        return status >= 400 && status < 500 ? 'permanent' : 'transient';
    }
    return 'transient';
}

// Prefer the AI service's own error detail (e.g. "URL ingest failed: ...")
// over axios's generic "Request failed with status code 502", which hides
// the actual cause. `detail` can be a non-empty string, an empty string
// (falls through), or a FastAPI validation error array.
export function extractIngestErrorMessage(err: any): string {
    const detail = err?.response?.data?.detail;
    if (typeof detail === 'string' && detail.length > 0) {
        return detail;
    }
    if (Array.isArray(detail) && detail.length > 0) {
        return JSON.stringify(detail);
    }
    return (err as Error)?.message ?? String(err);
}

@Injectable()
export class KnowledgeIngestTaskService {
    private readonly logger = new Logger(KnowledgeIngestTaskService.name);
    private readonly aiBackendUrl: string;

    constructor(
        private readonly knowledgeItemService: KnowledgeItemService,
        private readonly chatbotKnowledgeItemService: ChatbotKnowledgeItemService,
        private readonly awsS3Service: AwsS3Service,
        private readonly httpService: HttpService,
        private readonly configService: ConfigService
    ) {
        this.aiBackendUrl =
            this.configService.get<string>('ai.backend.url') ??
            'http://localhost:8000';
    }

    async handle(
        dto: KnowledgeIngestTaskDto,
        retryCount: number
    ): Promise<void> {
        const { knowledgeItemId } = dto;

        if (dto.jobName === ENUM_RAG_INGEST_PROCESS.INGEST) {
            try {
                await this.ingest(knowledgeItemId);
            } catch (err) {
                const kind = classifyIngestError(err);
                const attempt = retryCount + 1;
                const finalAttempt = attempt >= RAG_INGEST_MAX_ATTEMPTS;
                const message = extractIngestErrorMessage(err);
                this.logger.error(
                    `ingest failed item=${knowledgeItemId} kind=${kind} attempt=${attempt}/${RAG_INGEST_MAX_ATTEMPTS}: ${message}`
                );
                if (kind === 'permanent') {
                    await this.markFailed(knowledgeItemId, message);
                    return;
                }
                if (finalAttempt) {
                    await this.markFailed(knowledgeItemId, message);
                    Sentry.captureException(err, {
                        tags: {
                            queue: RAG_INGEST_SENTRY_QUEUE,
                            knowledge_item_id: knowledgeItemId,
                        },
                    });
                }
                throw err;
            }
        } else if (dto.jobName === ENUM_RAG_INGEST_PROCESS.REINDEX_LINKS) {
            try {
                await firstValueFrom(
                    this.httpService.patch(
                        `${this.aiBackendUrl}/api/rag/documents/by-item/${knowledgeItemId}/chatbots`,
                        { chatbot_ids: dto.chatbotIds },
                        {
                            timeout: RAG_INGEST_HTTP_TIMEOUT_MS,
                            headers: await this.authHeaders({
                                'Content-Type': 'application/json',
                            }),
                        }
                    )
                );
            } catch (err) {
                const kind = classifyIngestError(err);
                const message = (err as Error).message ?? String(err);
                this.logger.error(
                    `reindex-links failed item=${knowledgeItemId} kind=${kind}: ${message}`
                );
                if (kind === 'permanent') return;
                throw err;
            }
        } else if (dto.jobName === ENUM_RAG_INGEST_PROCESS.DELETE) {
            try {
                await firstValueFrom(
                    this.httpService.delete(
                        `${this.aiBackendUrl}/api/rag/documents/by-item/${knowledgeItemId}`,
                        {
                            timeout: RAG_INGEST_HTTP_TIMEOUT_MS,
                            headers: await this.authHeaders({
                                'Content-Type': 'application/json',
                            }),
                        }
                    )
                );
            } catch (err) {
                const kind = classifyIngestError(err);
                const message = (err as Error).message ?? String(err);
                this.logger.error(
                    `delete failed item=${knowledgeItemId} kind=${kind}: ${message}`
                );
                if (kind === 'permanent') return;
                throw err;
            }
        }
    }

    private async markFailed(id: string, errorMessage: string): Promise<void> {
        await this.knowledgeItemService.updateStatus(id, {
            status: ENUM_KNOWLEDGE_BASE_ITEM_STATUS.FAILED,
            errorMessage,
        });
    }

    private async chatbotIdsFor(knowledgeItemId: string): Promise<string[]> {
        const links =
            await this.chatbotKnowledgeItemService.findByKnowledgeItem(
                knowledgeItemId
            );
        return links
            .map(l => (l.chatbot as any)?.id ?? l.chatbot)
            .filter((v: unknown): v is string => typeof v === 'string');
    }

    private async authHeaders(
        extra: Record<string, string> = {}
    ): Promise<Record<string, string>> {
        return {
            ...(await getInternalAuthHeader(this.aiBackendUrl)),
            ...getInternalTokenHeader(this.configService),
            ...extra,
        };
    }

    private async ingest(knowledgeItemId: string): Promise<void> {
        const item =
            await this.knowledgeItemService.findOneById(knowledgeItemId);
        if (!item) {
            this.logger.debug(
                `ingest: item ${knowledgeItemId} not found — skipping`
            );
            return;
        }

        await this.knowledgeItemService.updateStatus(knowledgeItemId, {
            status: ENUM_KNOWLEDGE_BASE_ITEM_STATUS.PROCESSING,
            errorMessage: null,
        });

        const chatbotIds = await this.chatbotIdsFor(knowledgeItemId);
        let data: any;
        if (item.type === ENUM_KNOWLEDGE_BASE_ITEM_TYPE.FILE) {
            data = await this.ingestFile(item, chatbotIds);
        } else if (item.type === ENUM_KNOWLEDGE_BASE_ITEM_TYPE.URL) {
            data = await this.ingestUrl(item, chatbotIds);
        } else {
            data = await this.ingestText(item, chatbotIds);
        }
        await this.knowledgeItemService.updateStatus(knowledgeItemId, {
            status: ENUM_KNOWLEDGE_BASE_ITEM_STATUS.COMPLETED,
            errorMessage: null,
            processedAt: new Date(),
            metadata: {
                ...(item.metadata ?? {}),
                chunkCount: data?.chunk_count ?? 0,
            },
        });
        this.logger.log(
            `ingest done item=${knowledgeItemId} chunks=${data?.chunk_count ?? 0}`
        );
    }

    private async ingestFile(item: any, chatbotIds: string[]): Promise<any> {
        if (!item.attachment?.key) {
            throw new Error(
                'Knowledge item has no attachment — cannot ingest file'
            );
        }
        const buffer = await this.awsS3Service.getItemBuffer(
            item.attachment.key,
            {
                access: ENUM_AWS_S3_ACCESSIBILITY.PRIVATE,
            }
        );
        const form = new FormData();
        form.append('file', buffer, {
            filename: item.attachment.key.split('/').pop() ?? 'document',
            contentType: item.attachment.mime,
        });
        form.append('knowledge_item_id', item.id);
        form.append('chatbot_ids', chatbotIds.join(','));
        if (item.knowledgeBase?.id)
            form.append('knowledge_base_id', item.knowledgeBase.id);

        const resp = await firstValueFrom(
            this.httpService.post(
                `${this.aiBackendUrl}/api/rag/ingest/upload`,
                form,
                {
                    timeout: RAG_INGEST_HTTP_TIMEOUT_MS,
                    headers: await this.authHeaders(form.getHeaders()),
                    maxBodyLength: Infinity,
                }
            )
        );
        return (resp.data as any)?.data;
    }

    private async ingestUrl(item: any, chatbotIds: string[]): Promise<any> {
        const resp = await firstValueFrom(
            this.httpService.post(
                `${this.aiBackendUrl}/api/rag/ingest/url`,
                {
                    url: item.content,
                    knowledge_item_id: item.id,
                    chatbot_ids: chatbotIds,
                    knowledge_base_id: item.knowledgeBase?.id,
                },
                {
                    timeout: RAG_INGEST_HTTP_TIMEOUT_MS,
                    headers: await this.authHeaders({
                        'Content-Type': 'application/json',
                    }),
                }
            )
        );
        return (resp.data as any)?.data;
    }

    private async ingestText(item: any, chatbotIds: string[]): Promise<any> {
        const resp = await firstValueFrom(
            this.httpService.post(
                `${this.aiBackendUrl}/api/rag/ingest/text`,
                {
                    knowledge_item_id: item.id,
                    text: item.content ?? '',
                    title: item.title,
                    chatbot_ids: chatbotIds,
                    knowledge_base_id: item.knowledgeBase?.id,
                },
                {
                    timeout: RAG_INGEST_HTTP_TIMEOUT_MS,
                    headers: await this.authHeaders({
                        'Content-Type': 'application/json',
                    }),
                }
            )
        );
        return (resp.data as any)?.data;
    }
}
