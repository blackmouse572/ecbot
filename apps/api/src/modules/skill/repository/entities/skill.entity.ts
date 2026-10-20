import {
    Collection,
    Embedded,
    Entity,
    Enum,
    Index,
    ManyToOne,
    OneToMany,
    Property,
    Unique,
} from '@mikro-orm/postgresql';
import { DatabaseEntityBase } from 'src/common/database/bases/database.entity';
import { AwsS3Entity } from 'src/modules/aws/repository/entities/aws.s3.entity';
import { WorkspaceEntity } from 'src/modules/workspace/repository/entities/workspace.entity';
import type { SkillStep } from '@repo/agent-blueprint';
import type { ChatbotSkillEntity } from './chatbot-skill.entity';
import { ENUM_SKILL_FORMAT } from '../../enums/skill-format.enum';
import { ENUM_SKILL_STATUS } from '../../enums/skill-status.enum';

export const SkillTableName = 'skills';

@Entity({ tableName: SkillTableName })
@Index({ properties: ['workspace'] })
@Unique({ properties: ['workspace', 'slug'] })
export class SkillEntity extends DatabaseEntityBase {
    // null workspace = builtin skill authored by Ecbot
    @ManyToOne(() => WorkspaceEntity, { nullable: true })
    workspace?: WorkspaceEntity;

    // Inverse side only (no column), for the admin "skills of this agent"
    // filter. By name: a class import would cycle with chatbot-skill.entity.
    @OneToMany('ChatbotSkillEntity', 'skill')
    chatbotLinks = new Collection<ChatbotSkillEntity>(this);

    @Property({ type: 'varchar' })
    name: string;

    @Property({ type: 'varchar' })
    slug: string;

    @Property({ type: 'text', nullable: true })
    description?: string;

    @Enum(() => ENUM_SKILL_STATUS)
    status: ENUM_SKILL_STATUS = ENUM_SKILL_STATUS.ACTIVE;

    @Enum(() => ENUM_SKILL_FORMAT)
    format: ENUM_SKILL_FORMAT = ENUM_SKILL_FORMAT.CONTENT;

    // The step tree of a STEPS skill.
    @Property({ type: 'jsonb', nullable: true })
    steps?: SkillStep[] | null;

    @Property({ type: 'jsonb', defaultRaw: "'[]'" })
    guardrails: string[] = [];

    // Markdown the owner wrote for a CONTENT skill. Null on skills made before
    // guardrails existed: their S3 body is still exactly what they wrote.
    @Property({ type: 'text', nullable: true })
    instructions?: string | null;

    // What `load_skill` streams to the agent: `instructions` or the compiled
    // steps, plus guardrails. Lives on S3; this is the pointer (flat s3_* columns).
    @Embedded(() => AwsS3Entity)
    s3: AwsS3Entity;
}
