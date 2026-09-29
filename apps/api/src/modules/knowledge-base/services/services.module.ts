import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { AwsModule } from '@app/modules/aws/aws.module';
import { CloudTasksQueueModule } from '@app/worker/cloud-tasks-queue.module';
import { KnowledgeBaseService } from './knowledge-base.service';
import { KnowledgeItemService } from './knowledge-item.service';
import { KnowledgeItemFolderService } from './knowledge-item-folder.service';
import { KnowledgeItemTagService } from './knowledge-item-tag.service';
import { ChatbotKnowledgeItemService } from './chatbot-knowledge-item.service';
import { WorkspaceUsageService } from './workspace-usage.service';
import { UsageEventService } from './usage-event.service';
import { RagSyncService } from './rag-sync.service';
import { KnowledgeIngestService } from './knowledge-ingest.service';
import { KnowledgeIngestTaskService } from './knowledge-ingest-task.service';
import { KnowledgeFailureNotifierService } from './knowledge-failure-notifier.service';
import { KnowledgeBaseRepositoryModule } from '../repository/knowledge-base.repository.module';
import { NotificationModule } from '@app/modules/notification/notification.module';
import { WorkspaceRepositoryModule } from '@app/modules/workspace/repository/workspace.repository.module';

@Module({
    imports: [
        KnowledgeBaseRepositoryModule,
        HttpModule,
        AwsModule,
        CloudTasksQueueModule,
        NotificationModule,
        WorkspaceRepositoryModule,
    ],
    providers: [
        KnowledgeBaseService,
        KnowledgeItemService,
        KnowledgeItemFolderService,
        KnowledgeItemTagService,
        ChatbotKnowledgeItemService,
        WorkspaceUsageService,
        UsageEventService,
        RagSyncService,
        KnowledgeIngestService,
        KnowledgeIngestTaskService,
        KnowledgeFailureNotifierService,
    ],
    exports: [
        KnowledgeBaseService,
        KnowledgeItemService,
        KnowledgeItemFolderService,
        KnowledgeItemTagService,
        ChatbotKnowledgeItemService,
        WorkspaceUsageService,
        UsageEventService,
        RagSyncService,
        KnowledgeIngestService,
        KnowledgeIngestTaskService,
    ],
})
export class KnowledgeBaseServicesModule {}
