import { MikroOrmModule } from '@mikro-orm/nestjs';
import { Module } from '@nestjs/common';
import { ChatbotKnowledgeItemEntity } from './entities/chatbot-knowledge-item.entity';
import { KnowledgeBaseEntity } from './entities/knowledge-base.entity';
import { KnowledgeItemEntity } from './entities/knowledge-item.entity';
import { KnowledgeItemFolderEntity } from './entities/knowledge-item-folder.entity';
import { KnowledgeItemTagEntity } from './entities/knowledge-item-tag.entity';
import { UsageEventEntity } from './entities/usage-event.entity';
import { WorkspaceUsageEntity } from './entities/workspace-usage.entity';
import { ChatbotKnowledgeItemRepository } from './repositories/chatbot-knowledge-item.repository';
import { KnowledgeBaseRepository } from './repositories/knowledge-base.repository';
import { KnowledgeItemFolderRepository } from './repositories/knowledge-item-folder.repository';
import { KnowledgeItemRepository } from './repositories/knowledge-item.repository';
import { KnowledgeItemTagRepository } from './repositories/knowledge-item-tag.repository';
import { UsageEventRepository } from './repositories/usage-event.repository';
import { WorkspaceUsageRepository } from './repositories/workspace-usage.repository';

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
        ]),
    ],
    providers: [
        KnowledgeBaseRepository,
        KnowledgeItemRepository,
        KnowledgeItemFolderRepository,
        KnowledgeItemTagRepository,
        ChatbotKnowledgeItemRepository,
        WorkspaceUsageRepository,
        UsageEventRepository,
    ],
    exports: [
        KnowledgeBaseRepository,
        KnowledgeItemRepository,
        KnowledgeItemFolderRepository,
        KnowledgeItemTagRepository,
        ChatbotKnowledgeItemRepository,
        WorkspaceUsageRepository,
        UsageEventRepository,
    ],
})
export class KnowledgeBaseRepositoryModule {}
