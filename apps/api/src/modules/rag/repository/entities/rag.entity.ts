import {
    Embedded,
    Entity,
    Enum,
    Index,
    ManyToOne,
    Property,
} from '@mikro-orm/postgresql';
import { DatabaseEntityBase } from 'src/common/database/bases/database.entity';
import { AwsS3Entity } from 'src/modules/aws/repository/entities/aws.s3.entity';
import { ChatbotEntity } from 'src/modules/chatbot/repository/entities/chatbot.entity';
import { WorkspaceEntity } from 'src/modules/workspace/repository/entities/workspace.entity';
import { ENUM_RAG_STATUS } from '../../enums/rag.status.enum';

export const RAGTableName = 'RAGs';

@Entity({ tableName: 'rags' })
@Index({ properties: ['workspace', 'chatbot'] })
@Index({ properties: ['chatbot'] })
@Index({ properties: ['workspace'] })
@Index({ properties: ['status'] })
export class RAGEntity extends DatabaseEntityBase {
    @Embedded(() => AwsS3Entity)
    attachment: AwsS3Entity;

    @ManyToOne(() => ChatbotEntity)
    chatbot: ChatbotEntity;

    @ManyToOne(() => WorkspaceEntity)
    workspace: WorkspaceEntity;

    @Enum(() => ENUM_RAG_STATUS)
    status: ENUM_RAG_STATUS = ENUM_RAG_STATUS.PENDING;

    @Property({ type: 'array', nullable: true })
    embedding?: number[];

    @Property({ type: 'integer', nullable: true })
    errorCode?: number;

    @Property({ type: 'text', nullable: true })
    errorMessage?: string;
}
