import { AccountModule } from '@app/modules/account/account.module';
import { ChatbotModule } from '@app/modules/chatbot/chatbot.module';
import { CustomerModule } from '@app/modules/customer/customer.module';
import { NotificationModule } from '@app/modules/notification/notification.module';
import { ToolModule } from '@app/modules/tool/tool.module';
import { UserRepositoryModule } from '@app/modules/user/repository/user.repository.module';
import { WorkspaceRepositoryModule } from '@app/modules/workspace/repository/workspace.repository.module';
import { Module } from '@nestjs/common';
import { ConversationRepositoryModule } from './repository/conversation.repository.module';
import { ConversationMessagingService } from './services/conversation-messaging.service';
import { ConversationService } from './services/conversation.service';
import { MessageMediaService } from './services/message-media.service';
import { AwsModule } from '@app/modules/aws/aws.module';

@Module({
    imports: [
        ConversationRepositoryModule,
        NotificationModule,
        WorkspaceRepositoryModule,
        ChatbotModule,
        AccountModule,
        UserRepositoryModule,
        ToolModule,
        CustomerModule,
        AwsModule,
    ],
    providers: [
        ConversationService,
        ConversationMessagingService,
        MessageMediaService,
    ],
    exports: [
        ConversationService,
        ConversationMessagingService,
        MessageMediaService,
        ConversationRepositoryModule,
    ],
})
export class ConversationModule {}
