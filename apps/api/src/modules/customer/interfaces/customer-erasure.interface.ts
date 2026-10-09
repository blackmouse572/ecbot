import type { ConversationEntity } from '@app/modules/conversation/repository/entities/conversation.entity';
import type { MessageEntity } from '@app/modules/conversation/repository/entities/message.entity';
import type { FollowupEntity } from '@app/modules/platform/repository/entities/followup.entity';
import type { ToolInvocationEntity } from '@app/modules/tool/repository/entities/tool-invocation.entity';
import type { EntityManager } from '@mikro-orm/postgresql';
import type { ContactPointEntity } from '../repository/entities/contact-point.entity';
import type { CustomerTagAssignmentEntity } from '../repository/entities/customer-tag-assignment.entity';
import type { CustomerEntity } from '../repository/entities/customer.entity';

/**
 * The rows that make up one data subject: the customer, every profile merged
 * into it (following merge chains), their contact points, and their
 * conversations. Every row is inside one workspace.
 */
export interface ICustomerSubjectScope {
    customers: CustomerEntity[];
    contactPoints: ContactPointEntity[];
    conversations: ConversationEntity[];
}

/** Everything stored about one data subject, for an access request. */
export interface ICustomerSubjectData extends ICustomerSubjectScope {
    messages: MessageEntity[];
    tagAssignments: CustomerTagAssignmentEntity[];
    followups: FollowupEntity[];
    toolInvocations: ToolInvocationEntity[];
}

/** What a hard delete of one customer removed from the database. */
export interface ICustomerErasure {
    customerIds: string[];
    contactPointIds: string[];
    conversationIds: string[];
    messageCount: number;
    /** S3 keys of the stored message media, still to be removed. */
    mediaKeys: string[];
}

/**
 * Runs inside the erase transaction after the rows are deleted: a throw rolls
 * the delete back, and writes through `em` commit with it.
 */
export type CustomerErasureBeforeCommit = (
    erased: ICustomerErasure,
    em: EntityManager
) => Promise<void>;

/** Counts returned to the caller and written to the audit log (no PII). */
export interface ICustomerErasureSummary {
    customers: number;
    contactPoints: number;
    conversations: number;
    messages: number;
    mediaFiles: number;
}
