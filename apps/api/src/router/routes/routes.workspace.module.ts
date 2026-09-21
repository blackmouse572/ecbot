import { CommonModule } from '@app/common/common.module';
import { AccountModule } from '@app/modules/account/account.module';
import { ActivityWorkspaceController } from '@app/modules/activity/controllers/activity.workspace.controller';
import { ChatbotModule } from '@app/modules/chatbot/chatbot.module';
import { ClientCredentialModule } from '@app/modules/client-credential/client-credential.module';
import { ClientCredentialWorkspaceController } from '@app/modules/client-credential/controllers/client-credential.workspace.controller';
import { ConversationModule } from '@app/modules/conversation/conversation.module';
import { ConversationWorkspaceController } from '@app/modules/conversation/controllers/conversation.workspace.controller';
import { ContactPointWorkspaceController } from '@app/modules/customer/controllers/contact-point.workspace.controller';
import { CustomerMergeSuggestionWorkspaceController } from '@app/modules/customer/controllers/customer-merge-suggestion.workspace.controller';
import { CustomerTagAssignmentWorkspaceController } from '@app/modules/customer/controllers/customer-tag-assignment.workspace.controller';
import { CustomerTagWorkspaceController } from '@app/modules/customer/controllers/customer-tag.workspace.controller';
import { CustomerWorkspaceController } from '@app/modules/customer/controllers/customer.workspace.controller';
import { CustomerModule } from '@app/modules/customer/customer.module';
import { InvitationWorkspaceController } from '@app/modules/invitation/controllers/invitation.workspace.controller';
import { InvitationModule } from '@app/modules/invitation/invitation.module';
import { NavCountWorkspaceController } from '@app/modules/nav-count/controllers/nav-count.workspace.controller';
import { NavCountModule } from '@app/modules/nav-count/nav-count.module';
import { FollowupWorkspaceController } from '@app/modules/platform/controllers/followup.workspace.controller';
import { PlatformModule } from '@app/modules/platform/platform.module';
import { RAGWorkspaceController } from '@app/modules/rag/controllers/rag.workspace.controller';
import { RAGModule } from '@app/modules/rag/rag.module';
import { RequestsModule } from '@app/modules/requests/requests.module';
import { RoleWorkspaceController } from '@app/modules/role/controllers/role.workspace.controller';
import { RoleModule } from '@app/modules/role/role.module';
import { ChatbotToolWorkspaceController } from '@app/modules/tool/controllers/chatbot-tool.workspace.controller';
import { MarketplaceWorkspaceController } from '@app/modules/tool/controllers/marketplace.workspace.controller';
import { ToolWorkspaceController } from '@app/modules/tool/controllers/tool.workspace.controller';
import { ToolModule } from '@app/modules/tool/tool.module';
import { ChatbotSkillWorkspaceController } from '@app/modules/skill/controllers/chatbot-skill.workspace.controller';
import { SkillWorkspaceController } from '@app/modules/skill/controllers/skill.workspace.controller';
import { SkillModule } from '@app/modules/skill/skill.module';
import { ChatbotRepositoryModule } from '@app/modules/chatbot/repository/chatbot.repository.module';
import { WorkSpaceModule } from '@app/modules/workspace/workspace.module';
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ActivityModule } from 'src/modules/activity/activity.module';
import { ApiKeyModule } from 'src/modules/api-key/api-key.module';
import { AuthModule } from 'src/modules/auth/auth.module';
import { AwsModule } from 'src/modules/aws/aws.module';
import { CountryModule } from 'src/modules/country/country.module';
import { EmailModule } from 'src/modules/email/email.module';
import { PasswordHistoryModule } from 'src/modules/password-history/password-history.module';
import { SessionModule } from 'src/modules/session/session.module';
import { UserModule } from 'src/modules/user/user.module';
import { KnowledgeBaseModule } from '../../modules/knowledge-base/knowledge-base.module';
import {
    KnowledgeBaseWorkspaceController,
    KnowledgeItemWorkspaceController,
    KnowledgeItemTagController,
    KnowledgeItemFolderController,
    ChatbotKnowledgeItemWorkspaceController,
} from '../../modules/knowledge-base/controllers';
import { KnowledgeBaseServicesModule } from '../../modules/knowledge-base/services/services.module';

@Module({
    controllers: [
        RoleWorkspaceController,
        ActivityWorkspaceController,
        InvitationWorkspaceController,
        RAGWorkspaceController,
        KnowledgeBaseWorkspaceController,
        KnowledgeItemWorkspaceController,
        KnowledgeItemFolderController,
        KnowledgeItemTagController,
        ChatbotKnowledgeItemWorkspaceController,
        ConversationWorkspaceController,
        ToolWorkspaceController,
        ChatbotToolWorkspaceController,
        MarketplaceWorkspaceController,
        SkillWorkspaceController,
        ChatbotSkillWorkspaceController,
        CustomerWorkspaceController,
        ContactPointWorkspaceController,
        CustomerTagWorkspaceController,
        CustomerTagAssignmentWorkspaceController,
        CustomerMergeSuggestionWorkspaceController,
        NavCountWorkspaceController,
        FollowupWorkspaceController,
        ClientCredentialWorkspaceController,
    ],
    providers: [],
    exports: [],
    imports: [
        RequestsModule,
        RoleModule,
        UserModule,
        WorkSpaceModule,
        AwsModule,
        JwtModule,
        InvitationModule,
        AccountModule,
        EmailModule.register(),
        AuthModule,
        CountryModule,
        SessionModule,
        ChatbotModule,
        PasswordHistoryModule,
        ActivityModule,
        ApiKeyModule,
        ClientCredentialModule,
        CommonModule,
        RAGModule,
        KnowledgeBaseModule,
        KnowledgeBaseServicesModule,
        ConversationModule,
        ToolModule,
        SkillModule,
        CustomerModule,
        NavCountModule,
        PlatformModule,
        ChatbotRepositoryModule,
    ],
})
export class RoutesWorkspaceModule {}
