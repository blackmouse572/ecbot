import { ConversationEntity } from '@app/modules/conversation/repository/entities/conversation.entity';
import { MessageEntity } from '@app/modules/conversation/repository/entities/message.entity';
import { ConversationRepository } from '@app/modules/conversation/repository/repositories/conversation.repository';
import { MessageRepository } from '@app/modules/conversation/repository/repositories/message.repository';
import { ContactPointEntity } from '@app/modules/customer/repository/entities/contact-point.entity';
import { CustomerEntity } from '@app/modules/customer/repository/entities/customer.entity';
import { ContactPointRepository } from '@app/modules/customer/repository/repositories/contact-point.repository';
import { CustomerRepository } from '@app/modules/customer/repository/repositories/customer.repository';
import { Injectable, NotFoundException } from '@nestjs/common';
import { CustomerDataExportResponseDto } from '../dtos/response/customer-data-export.response.dto';
import {
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
    constructor(
        private readonly customerRepository: CustomerRepository,
        private readonly contactPointRepository: ContactPointRepository,
        private readonly conversationRepository: ConversationRepository,
        private readonly messageRepository: MessageRepository
    ) {}

    async export(
        customerId: string,
        workspaceId: string
    ): Promise<CustomerDataExportResponseDto> {
        // The customer plus the duplicates merged into it: same person.
        const customers = await this.customerRepository.find<CustomerEntity>(
            {
                workspace: workspaceId,
                $or: [{ id: customerId }, { mergedIntoCustomerId: customerId }],
            },
            { populate: [] }
        );
        const customer = customers.find(c => c.id === customerId);
        if (!customer) {
            throw new NotFoundException({
                message: 'customer.error.notFound',
                statusCode: 404,
            });
        }

        const contactPoints =
            await this.contactPointRepository.find<ContactPointEntity>(
                {
                    workspace: workspaceId,
                    customer: { $in: customers.map(c => c.id) },
                },
                { populate: [] }
            );
        const conversations = contactPoints.length
            ? await this.conversationRepository.find<ConversationEntity>(
                  {
                      contactPoint: { $in: contactPoints.map(c => c.id) },
                      chatbot: { workspace: workspaceId },
                  },
                  { populate: [], orderBy: { createdAt: 'ASC' } }
              )
            : [];
        const messages = conversations.length
            ? await this.messageRepository.find<MessageEntity>(
                  { conversation: { $in: conversations.map(c => c.id) } },
                  { populate: [], orderBy: { dateSent: 'ASC' } }
              )
            : [];

        const byConversation = new Map<string, IExportMessage[]>();
        for (const m of messages) {
            const key = refId(m.conversation);
            const list = byConversation.get(key) ?? [];
            list.push({
                id: m.id,
                direction: m.direction,
                authorType: m.authorType,
                text: m.text,
                attachments: m.attachments,
                reactions: m.reactions,
                raw: m.raw,
                dateSent: m.dateSent,
            });
            byConversation.set(key, list);
        }

        return {
            exportedAt: new Date(),
            customer: this.mapCustomer(customer),
            mergedCustomers: customers
                .filter(c => c.id !== customerId)
                .map(c => this.mapCustomer(c)),
            contactPoints: contactPoints.map(c => ({
                id: c.id,
                customerId: refId(c.customer),
                platform: c.platform,
                externalSenderId: c.externalSenderId,
                displaySenderName: c.displaySenderName,
                senderAvatar: c.senderAvatar,
                createdAt: c.createdAt,
            })),
            conversations: conversations.map(c => ({
                id: c.id,
                contactPointId: refId(c.contactPoint),
                senderName: c.senderName,
                senderAvatar: c.senderAvatar,
                status: c.status,
                createdAt: c.createdAt,
                lastMessageAt: c.lastMessageAt,
                messages: byConversation.get(c.id) ?? [],
            })),
        };
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
