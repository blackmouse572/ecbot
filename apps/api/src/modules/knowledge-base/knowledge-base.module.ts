import { Module } from '@nestjs/common';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { KnowledgeBaseEntity } from './repository/entities/knowledge-base.entity';
import { KnowledgeItemEntity } from './repository/entities/knowledge-item.entity';
import { KnowledgeItemFolderEntity } from './repository/entities/knowledge-item-folder.entity';
import { KnowledgeItemTagEntity } from './repository/entities/knowledge-item-tag.entity';
import { ChatbotKnowledgeItemEntity } from './repository/entities/chatbot-knowledge-item.entity';
import { WorkspaceUsageEntity } from './repository/entities/workspace-usage.entity';
import { UsageEventEntity } from './repository/entities/usage-event.entity';
import { KnowledgeItemChunkEntity } from './repository/entities/knowledge-item-chunk.entity';
import { KnowledgeBaseServicesModule } from './services/services.module';

@Module({
    imports: [
        MikroOrmModule.forFeature([
            KnowledgeBaseEntity,
            KnowledgeItemEntity,
            KnowledgeItemFolderEntity,
            KnowledgeItemTagEntity,
            ChatbotKnowledgeItemEntity,
            WorkspaceUsageEntity,
            UsageEventEntity,
            KnowledgeItemChunkEntity,
        ]),
        KnowledgeBaseServicesModule,
    ],
    controllers: [],
})
export class KnowledgeBaseModule {}
