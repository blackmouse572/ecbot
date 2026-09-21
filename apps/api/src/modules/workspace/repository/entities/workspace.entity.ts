import {
    BigIntType,
    Entity,
    Index,
    ManyToOne,
    Property,
    Rel,
} from '@mikro-orm/postgresql';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { DatabaseEntityBase } from 'src/common/database/bases/database.entity';
import { UserEntity } from 'src/modules/user/repository/entities/user.entity';
import { WORKSPACE_INVITATION_CODE_LENGTH } from '../../constants/workspace.constant';

export const WorkspaceTableName = 'workspaces';

@Entity({ tableName: WorkspaceTableName })
@Index({ properties: ['slug'] })
@Index({ properties: ['owner'] })
export class WorkspaceEntity extends DatabaseEntityBase {
    @Property({ type: 'varchar', length: 255 })
    @IsString()
    @IsNotEmpty()
    name: string;

    @Property({ type: 'varchar', length: 500, nullable: true })
    @IsString()
    @IsOptional()
    avatar?: string;

    @Property({ type: 'varchar', length: 100, unique: true })
    @IsString()
    @IsNotEmpty()
    slug: string;

    @ManyToOne(() => UserEntity)
    @IsNotEmpty()
    owner: Rel<UserEntity>;

    @Property({ type: 'varchar', length: WORKSPACE_INVITATION_CODE_LENGTH })
    @IsString()
    invitationCode: string;

    /**
     * Tokens granted outside the plan's periodic quota (admin top-up, deposits
     * later). Running total of the `token_credits` ledger, kept here so the
     * per-turn guard is one row read. Burned only after the period quota is
     * exhausted; may go slightly negative because a turn's cost is only known
     * once it finishes.
     */
    @Property({ type: new BigIntType('number'), default: 0 })
    tokenCreditBalance: number = 0;

    /** Warn the owner once usage passes this percent of the period quota. */
    @Property({ type: 'int', nullable: true })
    lowBalanceThreshold?: number;

    @Property({ type: 'timestamptz', nullable: true })
    lowBalanceNotifiedAt?: Date;
}
