import {
    Entity,
    Enum,
    Index,
    ManyToOne,
    Property,
    Unique,
} from '@mikro-orm/postgresql';
import { DatabaseEntityBase } from 'src/common/database/bases/database.entity';
import { WorkspaceEntity } from 'src/modules/workspace/repository/entities/workspace.entity';
import { ENUM_CUSTOMER_MERGE_SUGGESTION_STATUS } from '../../enums/customer.enum';
import { CustomerEntity } from './customer.entity';

export const CustomerMergeSuggestionTableName = 'customer_merge_suggestions';

/**
 * Pairwise merge suggestion produced by the match-detection subscriber when a
 * Customer's phone or email is set to a value that already exists on another
 * Customer in the same workspace.
 *
 * IMPORTANT — pair canonicalization:
 * `customerA` and `customerB` are *interchangeable* (a suggestion between X and
 * Y is the same as between Y and X). To keep the unique constraint useful and
 * to avoid duplicate suggestions, the service ALWAYS sorts the two customer
 * ids lexicographically before persisting: the smaller id goes in `customerA`,
 * the larger one in `customerB`. Never construct a suggestion entity without
 * going through that canonicalization step.
 */
@Entity({ tableName: CustomerMergeSuggestionTableName })
@Index({ properties: ['workspace'] })
@Index({ properties: ['status'] })
@Index({ properties: ['customerA'] })
@Index({ properties: ['customerB'] })
@Unique({
    properties: ['workspace', 'customerA', 'customerB', 'matchField'],
})
export class CustomerMergeSuggestionEntity extends DatabaseEntityBase {
    @ManyToOne(() => WorkspaceEntity)
    workspace: WorkspaceEntity;

    @ManyToOne(() => CustomerEntity)
    customerA: CustomerEntity;

    @ManyToOne(() => CustomerEntity)
    customerB: CustomerEntity;

    @Property({ type: 'varchar', length: 16 })
    matchField: 'phone' | 'email';

    @Property({ type: 'varchar', length: 255 })
    matchValue: string;

    @Enum(() => ENUM_CUSTOMER_MERGE_SUGGESTION_STATUS)
    status: ENUM_CUSTOMER_MERGE_SUGGESTION_STATUS =
        ENUM_CUSTOMER_MERGE_SUGGESTION_STATUS.PENDING;

    @Property({ type: 'timestamptz', nullable: true })
    resolvedAt?: Date;

    @Property({ type: 'uuid', nullable: true })
    mergedSurvivorId?: string;

    @Property({ type: 'uuid', nullable: true })
    mergedLoserId?: string;

    /**
     * Audit snapshot captured at merge time so `unmerge` can restore the
     * loser's contact points + tag assignments without ambiguity. Shape:
     *   {
     *     loserContactPointIds: string[];
     *     loserTagAssignmentIds: string[];     // loser's, soft-deleted by merge
     *     survivorTagAssignmentIds: string[];  // created on survivor by merge
     *     loserFields: { name?, phone?, email?, language?, notes?, profileSummary? };
     *   }
     */
    @Property({ type: 'jsonb', nullable: true })
    unmergeSnapshot?: Record<string, unknown>;
}
