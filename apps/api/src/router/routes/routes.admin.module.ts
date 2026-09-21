import { AccountModule } from '@app/modules/account/account.module';
import { AccountAdminController } from '@app/modules/account/controllers/account.admin.controller';
import { AwsModule } from '@app/modules/aws/aws.module';
import { ChatbotModule } from '@app/modules/chatbot/chatbot.module';
import { ChatbotAdminController } from '@app/modules/chatbot/controllers/chatbot.admin.controller';
import { RAGAdminController } from '@app/modules/rag/controllers/rag.admin.controller';
import { SkillAdminController } from '@app/modules/skill/controllers/skill.admin.controller';
import { SkillModule } from '@app/modules/skill/skill.module';
import { RAGModule } from '@app/modules/rag/rag.module';
import { WorkSpaceModule } from '@app/modules/workspace/workspace.module';
import { Module } from '@nestjs/common';
import { ActivityModule } from 'src/modules/activity/activity.module';
import { ActivityAdminController } from 'src/modules/activity/controllers/activity.admin.controller';
import { ApiKeyModule } from 'src/modules/api-key/api-key.module';
import { ApiKeyAdminController } from 'src/modules/api-key/controllers/api-key.admin.controller';
import { AuthModule } from 'src/modules/auth/auth.module';
import { AuthAdminController } from 'src/modules/auth/controllers/auth.admin.controller';
import { CountryModule } from 'src/modules/country/country.module';
import { EmailModule } from 'src/modules/email/email.module';
import { PasswordHistoryAdminGlobalController } from 'src/modules/password-history/controllers/password-history.admin-global.controller';
import { PasswordHistoryAdminController } from 'src/modules/password-history/controllers/password-history.admin.controller';
import { PasswordHistoryModule } from 'src/modules/password-history/password-history.module';
import { RoleAdminController } from 'src/modules/role/controllers/role.admin.controller';
import { RoleModule } from 'src/modules/role/role.module';
import { SessionAdminGlobalController } from 'src/modules/session/controllers/session.admin-global.controller';
import { SessionAdminController } from 'src/modules/session/controllers/session.admin.controller';
import { SessionModule } from 'src/modules/session/session.module';
import { SettingModule } from 'src/modules/setting/setting.module';
import { UserAdminController } from 'src/modules/user/controllers/user.admin.controller';
import { UserModule } from 'src/modules/user/user.module';
import { VerificationModule } from 'src/modules/verification/verification.module';
import { WaitlistAdminController } from 'src/modules/waitlist/controllers/waitlist.admin.controller';
import { WaitlistModule } from 'src/modules/waitlist/waitlist.module';
import { CloudTasksQueueModule } from 'src/worker/cloud-tasks-queue.module';

@Module({
    controllers: [
        ApiKeyAdminController,
        RoleAdminController,
        UserAdminController,
        AuthAdminController,
        SessionAdminController,
        SessionAdminGlobalController,
        PasswordHistoryAdminController,
        PasswordHistoryAdminGlobalController,
        ActivityAdminController,
        AccountAdminController,
        ChatbotAdminController,
        RAGAdminController,
        SkillAdminController,
        WaitlistAdminController,
    ],
    providers: [],
    exports: [],
    imports: [
        AwsModule,
        ApiKeyModule,
        SettingModule,
        RoleModule,
        UserModule,
        AuthModule,
        EmailModule.register(),
        CountryModule,
        SessionModule,
        PasswordHistoryModule,
        ActivityModule,
        VerificationModule,
        AccountModule,
        ChatbotModule,
        WorkSpaceModule,
        RAGModule,
        SkillModule,
        WaitlistModule,
        CloudTasksQueueModule,
    ],
})
export class RoutesAdminModule {}
