import { NotificationModule } from '@app/modules/notification/notification.module';
import { WorkspaceRepositoryModule } from '@app/modules/workspace/repository/workspace.repository.module';
import { ConversationRepositoryModule } from '@app/modules/conversation/repository/conversation.repository.module';
import { CloudTasksQueueModule } from '@app/worker/cloud-tasks-queue.module';
import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CustomerRepositoryModule } from './repository/customer.repository.module';
import { ContactPointService } from './services/contact-point.service';
import { CustomerMergeSuggestionService } from './services/customer-merge-suggestion.service';
import { CustomerTagAssignmentService } from './services/customer-tag-assignment.service';
import { CustomerTagClassifierService } from './services/customer-tag-classifier.service';
import { CustomerTagClassifierTaskService } from './services/customer-tag-classifier-task.service';
import { CustomerTagService } from './services/customer-tag.service';
import { CustomerService } from './services/customer.service';

@Module({
    imports: [
        ConfigModule,
        HttpModule,
        CustomerRepositoryModule,
        NotificationModule,
        WorkspaceRepositoryModule,
        ConversationRepositoryModule,
        CloudTasksQueueModule,
    ],
    providers: [
        CustomerService,
        ContactPointService,
        CustomerTagService,
        CustomerTagAssignmentService,
        CustomerMergeSuggestionService,
        CustomerTagClassifierService,
        CustomerTagClassifierTaskService,
    ],
    exports: [
        CustomerService,
        ContactPointService,
        CustomerTagService,
        CustomerTagAssignmentService,
        CustomerMergeSuggestionService,
        CustomerTagClassifierService,
        CustomerTagClassifierTaskService,
        CustomerRepositoryModule,
    ],
})
export class CustomerModule {}
