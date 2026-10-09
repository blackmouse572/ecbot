import { DatabaseRepository } from '@app/common/database/bases/database.repository';
import { IDatabaseFindAllOptions } from '@app/common/database/interfaces/database.interface';
import { EntityManager, FilterQuery } from '@mikro-orm/postgresql';
import { Injectable } from '@nestjs/common';
import { ConversationReadEntity } from '@app/modules/conversation/repository/entities/conversation-read.entity';
import { ConversationEntity } from '@app/modules/conversation/repository/entities/conversation.entity';
import { MessageEntity } from '@app/modules/conversation/repository/entities/message.entity';
import { FollowupEntity } from '@app/modules/platform/repository/entities/followup.entity';
import { ToolInvocationEntity } from '@app/modules/tool/repository/entities/tool-invocation.entity';
import {
    CustomerErasureBeforeCommit,
    ICustomerErasure,
    ICustomerSubjectData,
    ICustomerSubjectScope,
} from '../../interfaces/customer-erasure.interface';
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
     * Everything stored about one data subject, for an access request. Null
     * when the customer is not in this workspace.
     */
    async findSubjectData(
        customerId: string,
        workspaceId: string
    ): Promise<ICustomerSubjectData | null> {
        const em = this.em;
        const scope = await this.findSubjectScope(em, customerId, workspaceId);
        if (!scope) return null;

        const customerIds = scope.customers.map(c => c.id);
        const conversationIds = scope.conversations.map(c => c.id);
        const convs = { $in: conversationIds };
        const [messages, tagAssignments, followups, toolInvocations] =
            await Promise.all([
                conversationIds.length
                    ? em.find(
                          MessageEntity,
                          { conversation: convs },
                          { orderBy: { dateSent: 'ASC' } }
                      )
                    : [],
                em.find(
                    CustomerTagAssignmentEntity,
                    { customer: { $in: customerIds }, deletedAt: null },
                    { populate: ['tag'] }
                ),
                conversationIds.length
                    ? em.find(
                          FollowupEntity,
                          { conversation: convs },
                          { orderBy: { scheduledAt: 'ASC' } }
                      )
                    : [],
                conversationIds.length
                    ? em.find(
                          ToolInvocationEntity,
                          { conversationId: convs },
                          { orderBy: { createdAt: 'ASC' } }
                      )
                    : [],
            ]);

        return {
            ...scope,
            messages,
            tagAssignments,
            followups,
            toolInvocations,
        };
    }

    /**
     * Hard delete a customer (plus every profile merged into it) and every
     * row holding their data, in one transaction. Every lookup is pinned to
     * the workspace. Returns null, deleting nothing, when the customer is not
     * in this workspace. Children go first so no FK blocks a delete.
     * `beforeCommit` runs last inside the transaction.
     */
    async eraseInWorkspace(
        customerId: string,
        workspaceId: string,
        beforeCommit?: CustomerErasureBeforeCommit
    ): Promise<ICustomerErasure | null> {
        return this.em.transactional(async em => {
            const scope = await this.findSubjectScope(
                em,
                customerId,
                workspaceId
            );
            if (!scope) return null;

            const customerIds = scope.customers.map(c => c.id);
            const contactPointIds = scope.contactPoints.map(c => c.id);
            const conversationIds = scope.conversations.map(c => c.id);

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

            const erased: ICustomerErasure = {
                customerIds,
                contactPointIds,
                conversationIds,
                messageCount,
                mediaKeys,
            };
            await beforeCommit?.(erased, em);
            return erased;
        });
    }

    /**
     * The customer, every profile merged into it (A into B into C: erasing C
     * reaches A and B), their contact points and their conversations.
     */
    private async findSubjectScope(
        em: EntityManager,
        customerId: string,
        workspaceId: string
    ): Promise<ICustomerSubjectScope | null> {
        const customers = await em.find(CustomerEntity, {
            workspace: workspaceId,
            $or: [{ id: customerId }, { mergedIntoCustomerId: customerId }],
        });
        if (!customers.some(c => c.id === customerId)) return null;

        let frontier = customers.filter(c => c.id !== customerId);
        while (frontier.length) {
            // `$nin` stops a corrupt merge cycle from looping forever.
            frontier = await em.find(CustomerEntity, {
                workspace: workspaceId,
                mergedIntoCustomerId: { $in: frontier.map(c => c.id) },
                id: { $nin: customers.map(c => c.id) },
            });
            customers.push(...frontier);
        }

        const contactPoints = await em.find(ContactPointEntity, {
            workspace: workspaceId,
            customer: { $in: customers.map(c => c.id) },
        });

        const conversations = contactPoints.length
            ? await em.find(
                  ConversationEntity,
                  {
                      chatbot: { workspace: workspaceId },
                      $or: [
                          {
                              contactPoint: {
                                  $in: contactPoints.map(c => c.id),
                              },
                          },
                          // A conversation started before its contact point
                          // existed may never have been linked to it. The
                          // same channel type and sender id is the same person.
                          ...contactPoints.map(c => ({
                              contactPoint: null,
                              senderId: c.externalSenderId,
                              account: { type: c.platform },
                          })),
                      ],
                  },
                  { orderBy: { createdAt: 'ASC' } }
              )
            : [];

        return { customers, contactPoints, conversations };
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
