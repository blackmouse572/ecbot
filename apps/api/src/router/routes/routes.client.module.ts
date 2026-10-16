import { ClientCredentialModule } from '@app/modules/client-credential/client-credential.module';
import { ClientCredentialClientController } from '@app/modules/client-credential/controllers/client-credential.client.controller';
import { PlatformModule } from '@app/modules/platform/platform.module';
import { ApiChannelClientController } from '@app/modules/platform/controllers/api-channel.client.controller';
import { AccountModule } from '@app/modules/account/account.module';
import { ChatbotClientController } from '@app/modules/chatbot/controllers/chatbot.client.controller';
import { ChatbotModule } from '@app/modules/chatbot/chatbot.module';
import { ActivityModule } from '@app/modules/activity/activity.module';
import { AwsModule } from '@app/modules/aws/aws.module';
import { ConversationClientController } from '@app/modules/conversation/controllers/conversation.client.controller';
import { ConversationModule } from '@app/modules/conversation/conversation.module';
import { CustomerClientController } from '@app/modules/customer/controllers/customer.client.controller';
import { CustomerTagAssignmentClientController } from '@app/modules/customer/controllers/customer-tag-assignment.client.controller';
import { CustomerTagClientController } from '@app/modules/customer/controllers/customer-tag.client.controller';
import { CustomerModule } from '@app/modules/customer/customer.module';
import { KnowledgeBaseClientController } from '@app/modules/knowledge-base/controllers/knowledge-base.client.controller';
import { KnowledgeItemClientController } from '@app/modules/knowledge-base/controllers/knowledge-item.client.controller';
import { ChatbotKnowledgeItemClientController } from '@app/modules/knowledge-base/controllers/chatbot-knowledge-item.client.controller';
import { KnowledgeBaseServicesModule } from '@app/modules/knowledge-base/services/services.module';
import { RoleModule } from '@app/modules/role/role.module';
import { ChatbotSkillClientController } from '@app/modules/skill/controllers/chatbot-skill.client.controller';
import { SkillClientController } from '@app/modules/skill/controllers/skill.client.controller';
import { SkillModule } from '@app/modules/skill/skill.module';
import { ChatbotToolClientController } from '@app/modules/tool/controllers/chatbot-tool.client.controller';
import { ToolClientController } from '@app/modules/tool/controllers/tool.client.controller';
import { ToolModule } from '@app/modules/tool/tool.module';
import { WorkSpaceModule } from '@app/modules/workspace/workspace.module';
import { Module } from '@nestjs/common';

// 3rd-party surface — every controller here authenticates via x-api-key
// (ClientCredential) and derives its workspace from the credential. See ADR-0012.
@Module({
    controllers: [
        ClientCredentialClientController,
        ApiChannelClientController,
        ChatbotClientController,
        KnowledgeBaseClientController,
        KnowledgeItemClientController,
        ChatbotKnowledgeItemClientController,
        ConversationClientController,
        CustomerClientController,
        CustomerTagClientController,
        CustomerTagAssignmentClientController,
        ToolClientController,
        ChatbotToolClientController,
        SkillClientController,
        ChatbotSkillClientController,
    ],
    providers: [],
    exports: [],
    imports: [
        ClientCredentialModule,
        PlatformModule,
        AccountModule,
        ChatbotModule,
        KnowledgeBaseServicesModule,
        AwsModule,
        ConversationModule,
        ActivityModule,
        CustomerModule,
        ToolModule,
        SkillModule,
        // ClientCredentialPolicyGuard checks the credential creator's roles.
        WorkSpaceModule,
        RoleModule,
    ],
})
export class RoutesClientModule {}
