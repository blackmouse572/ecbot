import { DatabaseRepository } from '@app/common/database/bases/database.repository';
import { IDatabaseFindAllOptions } from '@app/common/database/interfaces/database.interface';
import { EntityManager, FilterQuery } from '@mikro-orm/postgresql';
import { Injectable } from '@nestjs/common';
import { ConversationReadEntity } from '@app/modules/conversation/repository/entities/conversation-read.entity';
import { ConversationEntity } from '@app/modules/conversation/repository/entities/conversation.entity';
import { MessageEntity } from '@app/modules/conversation/repository/entities/message.entity';
import { FollowupEntity } from '@app/modules/platform/repository/entities/followup.entity';
import { ToolInvocationEntity } from '@app/modules/tool/repository/entities/tool-invocation.entity';
import { ICustomerErasure } from '../../interfaces/customer-erasure.interface';
import { ContactPointEntity } from '../entities/contact-point.entity';
import { CustomerMergeSuggestionEntity } from '../entities/customer-merge-suggestion.entity';
import { CustomerTagAssignmentEntity } from '../entities/customer-tag-assignment.entity';
import { CustomerEntity } from '../entities/customer.entity';

@Injectable()
export class CustomerRepository extends DatabaseRepository<CustomerEntity> {
    constructor(em: EntityManager) {
        super(em, CustomerEntity);
    }

    /** The workspace's customers, without deleted ones or merged-away duplicates. */
    async findByWorkspace(
        workspaceId: string,
        find?: Record<string, any>,
        options?: IDatabaseFindAllOptions
    ): Promise<CustomerEntity[]> {
        return this.find(this.workspaceFilter(workspaceId, find), options);
    }

    async countByWorkspace(
        workspaceId: string,
        find?: Record<string, any>
    ): Promise<number> {
        return this.getTotal(this.workspaceFilter(workspaceId, find));
    }

    /**
     * Hard delete a customer (plus the duplicates merged into it) and every
     * row holding their data, in one transaction. Every lookup is pinned to
     * the workspace. Returns null, deleting nothing, when the customer is not
     * in this workspace. Children go first so no FK blocks a delete.
     */
    async eraseInWorkspace(
        customerId: string,
        workspaceId: string
    ): Promise<ICustomerErasure | null> {
        return this.em.transactional(async em => {
            const customers = await em.find(
                CustomerEntity,
                {
                    workspace: workspaceId,
                    $or: [
                        { id: customerId },
                        { mergedIntoCustomerId: customerId },
                    ],
                },
                { fields: ['id'] }
            );
            if (!customers.some(c => c.id === customerId)) {
                return null;
            }
            const customerIds = customers.map(c => c.id);

            const contactPoints = await em.find(
                ContactPointEntity,
                { workspace: workspaceId, customer: { $in: customerIds } },
                { fields: ['id'] }
            );
            const contactPointIds = contactPoints.map(c => c.id);

            const conversations = contactPointIds.length
                ? await em.find(
                      ConversationEntity,
                      {
                          contactPoint: { $in: contactPointIds },
                          chatbot: { workspace: workspaceId },
                      },
                      { fields: ['id'] }
                  )
                : [];
            const conversationIds = conversations.map(c => c.id);

            let messageCount = 0;
            const mediaKeys: string[] = [];
            if (conversationIds.length) {
                const convs = { $in: conversationIds };
                const messages = await em.find(
                    MessageEntity,
                    { conversation: convs },
                    { fields: ['attachments'] }
                );
                messageCount = messages.length;
                for (const message of messages) {
                    for (const attachment of message.attachments ?? []) {
                        if (attachment.key) mediaKeys.push(attachment.key);
                    }
                }

                await em.nativeDelete(ToolInvocationEntity, {
                    conversationId: convs,
                });
                await em.nativeDelete(FollowupEntity, { conversation: convs });
                await em.nativeDelete(ConversationReadEntity, {
                    conversation: convs,
                });
                await em.nativeDelete(MessageEntity, { conversation: convs });
                await em.nativeDelete(ConversationEntity, { id: convs });
            }

            const ids = { $in: customerIds };
            await em.nativeDelete(CustomerTagAssignmentEntity, {
                customer: ids,
            });
            await em.nativeDelete(CustomerMergeSuggestionEntity, {
                workspace: workspaceId,
                $or: [{ customerA: ids }, { customerB: ids }],
            });
            if (contactPointIds.length) {
                await em.nativeDelete(ContactPointEntity, {
                    id: { $in: contactPointIds },
                    workspace: workspaceId,
                });
            }
            await em.nativeDelete(CustomerEntity, {
                id: ids,
                workspace: workspaceId,
            });

            return {
                customerIds,
                contactPointIds,
                conversationIds,
                messageCount,
                mediaKeys,
            };
        });
    }

    // A merge keeps the losing row with mergedIntoCustomerId set; listing it
    // would show the same person twice.
    private workspaceFilter(
        workspaceId: string,
        find?: Record<string, any>
    ): FilterQuery<CustomerEntity> {
        return {
            workspace: workspaceId,
            deletedAt: null,
            mergedIntoCustomerId: null,
            ...find,
        } as FilterQuery<CustomerEntity>;
    }
}
