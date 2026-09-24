import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as Sentry from '@sentry/nestjs';
import { firstValueFrom } from 'rxjs';
import { ConversationRepository } from '@app/modules/conversation/repository/repositories/conversation.repository';
import { MessageRepository } from '@app/modules/conversation/repository/repositories/message.repository';
import { ENUM_MESSAGE_DIRECTION } from '@app/modules/conversation/enums/message.enum';
import {
    CUSTOMER_TAG_CLASSIFIER_HTTP_TIMEOUT_MS,
    CUSTOMER_TAG_CLASSIFIER_MAX_ATTEMPTS,
    CUSTOMER_TAG_CLASSIFIER_MESSAGE_WINDOW,
    CUSTOMER_TAG_CLASSIFIER_SENTRY_QUEUE,
    ENUM_CUSTOMER_TAG_CLASSIFIER_PROCESS,
} from '../constants/customer-tag-classifier.constant';
import { CustomerTagClassifierTaskDto } from '../dtos/customer-tag-classifier.task.dto';
import { CustomerTagAssignmentService } from './customer-tag-assignment.service';
import { CustomerTagService } from './customer-tag.service';
import { CustomerRepository } from '../repository/repositories/customer.repository';
import { CustomerTagClassifierService } from './customer-tag-classifier.service';
import { getInternalTokenHeader } from '@app/common/utils/ai-internal-headers.util';

interface IClassifierMessagePayload {
    role: 'user' | 'bot' | 'operator' | 'system';
    text: string;
    ts: string;
}

interface IClassifierTagDef {
    name: string;
    emoji: string | null;
    description: string;
}

interface IClassifierResponse {
    tags_to_add?: string[];
    tags_to_remove?: string[];
    profile_summary?: string;
}

@Injectable()
export class CustomerTagClassifierTaskService {
    private readonly logger = new Logger(CustomerTagClassifierTaskService.name);
    private readonly aiBackendUrl: string;

    constructor(
        private readonly conversationRepository: ConversationRepository,
        private readonly messageRepository: MessageRepository,
        private readonly customerRepository: CustomerRepository,
        private readonly customerTagService: CustomerTagService,
        private readonly customerTagAssignmentService: CustomerTagAssignmentService,
        private readonly classifierService: CustomerTagClassifierService,
        private readonly httpService: HttpService,
        private readonly configService: ConfigService
    ) {
        this.aiBackendUrl =
            this.configService.get<string>('ai.backend.url') ??
            'http://localhost:8000';
    }

    async handle(
        dto: CustomerTagClassifierTaskDto,
        retryCount: number
    ): Promise<void> {
        if (dto.jobName !== ENUM_CUSTOMER_TAG_CLASSIFIER_PROCESS.CLASSIFY) {
            this.logger.warn(`Unknown job name: ${dto.jobName}`);
            return;
        }

        try {
            await this.classify(dto.conversationId, dto.snapshotKey);
        } catch (err) {
            const attempt = retryCount + 1;
            this.logger.error(
                `classify failed conv=${dto.conversationId} attempt=${attempt}/${CUSTOMER_TAG_CLASSIFIER_MAX_ATTEMPTS}: ${(err as Error).message}`
            );
            if (attempt >= CUSTOMER_TAG_CLASSIFIER_MAX_ATTEMPTS) {
                Sentry.captureException(err, {
                    tags: {
                        queue: CUSTOMER_TAG_CLASSIFIER_SENTRY_QUEUE,
                        conversation_id: dto.conversationId,
                    },
                });
            }
            throw err;
        }
    }

    private async classify(
        conversationId: string,
        snapshotKey: string
    ): Promise<void> {
        const conversation = await this.conversationRepository.findOneById(
            conversationId,
            {
                populate: [
                    'contactPoint',
                    'contactPoint.customer',
                    'chatbot',
                    'chatbot.workspace',
                ] as any,
            } as any
        );

        if (!conversation) {
            this.logger.debug(
                `classify: conversation ${conversationId} not found — likely deleted`
            );
            return;
        }

        const contactPoint: any = (conversation as any).contactPoint;
        const customerId: string | undefined =
            contactPoint?.customer?.id ?? contactPoint?.customer;
        if (!customerId) {
            this.logger.debug(
                `classify: conversation ${conversationId} has no customer — skipping`
            );
            return;
        }

        const currentSnapshot = this.classifierService.buildSnapshotKeyFor(
            conversation.lastMessageAt,
            conversation.status
        );
        if (currentSnapshot !== snapshotKey) {
            this.logger.debug(
                `classify: skipping stale snapshot for conv=${conversationId} ` +
                    `scheduled=${snapshotKey} current=${currentSnapshot}`
            );
            return;
        }

        const workspaceId: string | undefined = (conversation as any).chatbot
            ?.workspace?.id;
        if (!workspaceId) {
            this.logger.warn(
                `classify: conversation ${conversationId} chatbot has no workspace`
            );
            return;
        }

        const messages = await this.messageRepository.findByConversation(
            conversationId,
            { limit: CUSTOMER_TAG_CLASSIFIER_MESSAGE_WINDOW }
        );
        const recentMessages: IClassifierMessagePayload[] = messages.map(m => ({
            role: this.roleFor(m.authorType, m.direction),
            text: m.text ?? '',
            ts: m.dateSent.toISOString(),
        }));

        const catalog = await this.customerTagService.findAllByWorkspace(
            workspaceId
        );
        const availableTags: IClassifierTagDef[] = catalog
            .filter(t => !t.triggersHandoff)
            .map(t => ({
                name: t.name,
                emoji: t.emoji ?? null,
                description: t.description ?? '',
            }));

        const currentAssignments =
            await this.customerTagAssignmentService.listByCustomer(customerId);
        const currentTags: string[] = currentAssignments
            .map(a => (a.tag as any)?.name)
            .filter((n: string | undefined): n is string => Boolean(n));

        if (availableTags.length === 0) {
            this.logger.debug(
                `classify: workspace ${workspaceId} has no analytical tags — only updating summary`
            );
        }

        const result = await this.callClassifier({
            customer_id: customerId,
            conversation_id: conversationId,
            recent_messages: recentMessages,
            available_tags: availableTags,
            current_tags: currentTags,
        });

        const availableNames = new Set(availableTags.map(t => t.name));
        const handoffNames = new Set(
            catalog.filter(t => t.triggersHandoff).map(t => t.name)
        );

        for (const name of result.tags_to_add ?? []) {
            if (!availableNames.has(name) || handoffNames.has(name)) {
                this.logger.debug(
                    `classify: skipping unknown / handoff tag add "${name}" for customer=${customerId}`
                );
                continue;
            }
            const tag = catalog.find(t => t.name === name);
            if (!tag) continue;
            try {
                await this.customerTagAssignmentService.apply(customerId, tag.id);
            } catch (err) {
                this.logger.warn(
                    `classify: apply tag "${name}" failed: ${(err as Error).message}`
                );
            }
        }

        const currentSet = new Set(currentTags);
        for (const name of result.tags_to_remove ?? []) {
            if (!currentSet.has(name) || handoffNames.has(name)) continue;
            const tag = catalog.find(t => t.name === name);
            if (!tag) continue;
            try {
                await this.customerTagAssignmentService.remove(customerId, tag.id);
            } catch (err) {
                this.logger.warn(
                    `classify: remove tag "${name}" failed: ${(err as Error).message}`
                );
            }
        }

        const summary = (result.profile_summary ?? '').trim();
        if (summary) {
            await this.customerRepository.updateEntity(
                { id: customerId },
                { profileSummary: summary } as any
            );
        }

        this.logger.log(
            `classify done conv=${conversationId} customer=${customerId} ` +
                `+${(result.tags_to_add ?? []).length}/-${(result.tags_to_remove ?? []).length} ` +
                `summary=${summary ? 'yes' : 'no'}`
        );
    }

    private roleFor(
        authorType: string,
        direction: string
    ): IClassifierMessagePayload['role'] {
        if (direction === ENUM_MESSAGE_DIRECTION.INBOUND) return 'user';
        if (authorType === 'BOT') return 'bot';
        if (authorType === 'OPERATOR') return 'operator';
        if (authorType === 'SYSTEM') return 'system';
        return 'bot';
    }

    private async callClassifier(body: {
        customer_id: string;
        conversation_id: string;
        recent_messages: IClassifierMessagePayload[];
        available_tags: IClassifierTagDef[];
        current_tags: string[];
    }): Promise<IClassifierResponse> {
        const resp = await firstValueFrom(
            this.httpService.post(
                `${this.aiBackendUrl}/api/customer/classify`,
                body,
                {
                    timeout: CUSTOMER_TAG_CLASSIFIER_HTTP_TIMEOUT_MS,
                    headers: {
                        ...getInternalTokenHeader(this.configService),
                        'Content-Type': 'application/json',
                    },
                }
            )
        );
        const payload = resp.data as {
            data?: IClassifierResponse;
        } & IClassifierResponse;
        return (payload?.data ?? payload ?? {}) as IClassifierResponse;
    }
}
