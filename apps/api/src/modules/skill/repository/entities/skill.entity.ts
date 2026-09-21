import {
    Embedded,
    Entity,
    Enum,
    Index,
    ManyToOne,
    Property,
    Unique,
} from '@mikro-orm/postgresql';
import { DatabaseEntityBase } from 'src/common/database/bases/database.entity';
import { AwsS3Entity } from 'src/modules/aws/repository/entities/aws.s3.entity';
import { WorkspaceEntity } from 'src/modules/workspace/repository/entities/workspace.entity';
import { ENUM_SKILL_STATUS } from '../../enums/skill-status.enum';

export const SkillTableName = 'skills';

@Entity({ tableName: SkillTableName })
@Index({ properties: ['workspace'] })
@Unique({ properties: ['workspace', 'slug'] })
export class SkillEntity extends DatabaseEntityBase {
    // null workspace = builtin skill authored by Ecbot
    @ManyToOne(() => WorkspaceEntity, { nullable: true })
    workspace?: WorkspaceEntity;

    @Property({ type: 'varchar' })
    name: string;

    @Property({ type: 'varchar' })
    slug: string;

    @Property({ type: 'text', nullable: true })
    description?: string;

    @Enum(() => ENUM_SKILL_STATUS)
    status: ENUM_SKILL_STATUS = ENUM_SKILL_STATUS.ACTIVE;

    // Instructions body lives on S3; this is the pointer (flat s3_* columns).
    @Embedded(() => AwsS3Entity)
    s3: AwsS3Entity;
}
