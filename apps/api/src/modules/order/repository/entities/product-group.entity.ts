import {
    Embedded,
    Entity,
    ManyToOne,
    Property,
    Unique,
} from '@mikro-orm/postgresql';
import { DatabaseEntityBase } from 'src/common/database/bases/database.entity';
import { AwsS3Entity } from 'src/modules/aws/repository/entities/aws.s3.entity';
import { WorkspaceEntity } from 'src/modules/workspace/repository/entities/workspace.entity';

export const ProductGroupTableName = 'product_groups';

/**
 * A group of products a shop sells and customers buy again on a cycle
 * ("Kem chống nắng", "Serum"). Order items point at a group so marketing can
 * reason per group: last purchase, repurchase reminders, "để sau" holds.
 */
@Entity({ tableName: ProductGroupTableName })
// Groups are hard-deleted, so the name stays unique without soft-delete gaps.
@Unique({ properties: ['workspace', 'name'] })
export class ProductGroupEntity extends DatabaseEntityBase {
    @ManyToOne(() => WorkspaceEntity)
    workspace: WorkspaceEntity;

    @Property({ type: 'varchar', length: 120 })
    name: string;

    // Days between two purchases the owner expects; used until enough orders
    // exist to learn the cycle.
    @Property({ type: 'integer', nullable: true })
    defaultRepurchaseDays?: number;

    // Median days between two consecutive confirmed orders of the same
    // customer for this group, once there are enough pairs. Recomputed when an
    // order containing the group is confirmed or cancelled.
    @Property({ type: 'integer', nullable: true })
    learnedRepurchaseDays?: number;

    // A photo of the group, sent with offers about it (#504).
    @Embedded(() => AwsS3Entity, { nullable: true })
    image?: AwsS3Entity | null;

    // Where a customer buys it: the shop's product page.
    @Property({ type: 'varchar', length: 2048, nullable: true })
    link?: string | null;
}
