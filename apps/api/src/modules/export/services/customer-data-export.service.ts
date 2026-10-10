import { MessageEntity } from '@app/modules/conversation/repository/entities/message.entity';
import { IMessageAttachment } from '@app/modules/conversation/interfaces/message-media.interface';
import { CustomerEntity } from '@app/modules/customer/repository/entities/customer.entity';
import { CustomerRepository } from '@app/modules/customer/repository/repositories/customer.repository';
import { Injectable, NotFoundException } from '@nestjs/common';
import { CustomerDataExportResponseDto } from '../dtos/response/customer-data-export.response.dto';
import {
    IExportAttachment,
    IExportCustomer,
    IExportMessage,
} from '../interfaces/export.interface';
import { refId } from '../utils/ref-id.util';

/**
 * Everything a workspace holds about one end customer, for answering a data
 * subject access request. Every lookup is pinned to the workspace.
 */
@Injectable()
export class CustomerDataExportService {
    constructor(private readonly customerRepository: CustomerRepository) {}

    async export(
        customerId: string,
        workspaceId: string
    ): Promise<CustomerDataExportResponseDto> {
        // The customer plus every profile merged into it: same person.
        const data = await this.customerRepository.findSubjectData(
            customerId,
            workspaceId
        );
        const customer = data?.customers.find(c => c.id === customerId);
        if (!data || !customer) {
            throw new NotFoundException({
                message: 'customer.error.notFound',
                statusCode: 404,
            });
        }

        const byConversation = new Map<string, IExportMessage[]>();
        for (const m of data.messages) {
            const key = refId(m.conversation);
            const list = byConversation.get(key) ?? [];
            list.push(this.mapMessage(m));
            byConversation.set(key, list);
        }

        return {
            exportedAt: new Date(),
            customer: this.mapCustomer(customer),
            mergedCustomers: data.customers
                .filter(c => c.id !== customerId)
                .map(c => this.mapCustomer(c)),
            tags: data.tagAssignments.map(a => ({
                customerId: refId(a.customer),
                name: a.tag?.name,
                assignedAt: a.createdAt,
            })),
            contactPoints: data.contactPoints.map(c => ({
                id: c.id,
                customerId: refId(c.customer),
                platform: c.platform,
                externalSenderId: c.externalSenderId,
                displaySenderName: c.displaySenderName,
                senderAvatar: c.senderAvatar,
                createdAt: c.createdAt,
            })),
            conversations: data.conversations.map(c => ({
                id: c.id,
                contactPointId: refId(c.contactPoint),
                senderName: c.senderName,
                senderAvatar: c.senderAvatar,
                status: c.status,
                createdAt: c.createdAt,
                lastMessageAt: c.lastMessageAt,
                messages: byConversation.get(c.id) ?? [],
            })),
            followups: data.followups.map(f => ({
                id: f.id,
                conversationId: refId(f.conversation),
                prompt: f.prompt,
                reason: f.reason,
                status: f.status,
                scheduledAt: f.scheduledAt,
                firedAt: f.firedAt,
                cancelledAt: f.cancelledAt,
            })),
            toolInvocations: data.toolInvocations.map(t => ({
                id: t.id,
                conversationId: t.conversationId,
                actionName: t.actionName,
                status: t.status,
                inputArgs: t.inputArgs,
                outputResult: t.outputResult,
                errorMessage: t.errorMessage,
                createdAt: t.createdAt,
            })),
        };
    }

    private mapMessage(m: MessageEntity): IExportMessage {
        return {
            id: m.id,
            direction: m.direction,
            authorType: m.authorType,
            text: m.text,
            attachments: m.attachments?.map(a => this.mapAttachment(a)),
            reactions: m.reactions,
            raw: m.raw,
            dateSent: m.dateSent,
        };
    }

    /**
     * A stored file is named by its file name only: the storage key and
     * bucket are internal. The original platform url stays as it was sent.
     */
    private mapAttachment(a: IMessageAttachment): IExportAttachment {
        return a.key
            ? {
                  type: a.type,
                  description: a.description,
                  file: a.key.split('/').pop(),
              }
            : { type: a.type, description: a.description, url: a.url };
    }

    private mapCustomer(c: CustomerEntity): IExportCustomer {
        return {
            id: c.id,
            name: c.name,
            phone: c.phone,
            email: c.email,
            language: c.language,
            metadata: c.metadata,
            profileSummary: c.profileSummary,
            notes: c.notes,
            mergedIntoCustomerId: c.mergedIntoCustomerId,
            createdAt: c.createdAt,
            updatedAt: c.updatedAt,
        };
    }
}
