import { AccountModule } from '@app/modules/account/account.module';
import { AccountController } from '@app/modules/account/controllers/account.controller';
import { ChatbotModule } from '@app/modules/chatbot/chatbot.module';
import { ChatbotController } from '@app/modules/chatbot/controllers/chatbot.controller';
import { ToolModule } from '@app/modules/tool/tool.module';
import { CountrySharedController } from '@app/modules/country/controllers/country.shared.controller';
import { RequestsModule } from '@app/modules/requests/requests.module';
import { RoleModule } from '@app/modules/role/role.module';
import { WorkSpaceModule } from '@app/modules/workspace/workspace.module';
import { Module } from '@nestjs/common';
import { ActivityModule } from 'src/modules/activity/activity.module';
import { ActivitySharedController } from 'src/modules/activity/controllers/activity.shared.controller';
import { ApiKeyModule } from 'src/modules/api-key/api-key.module';
import { AuthModule } from 'src/modules/auth/auth.module';
import { AuthSharedController } from 'src/modules/auth/controllers/auth.shared.controller';
import { AwsModule } from 'src/modules/aws/aws.module';
import { CountryModule } from 'src/modules/country/country.module';
import { EmailModule } from 'src/modules/email/email.module';
import { PasswordHistorySharedController } from 'src/modules/password-history/controllers/password-history.shared.controller';
import { PasswordHistoryModule } from 'src/modules/password-history/password-history.module';
import { SessionSharedController } from 'src/modules/session/controllers/session.shared.controller';
import { SessionModule } from 'src/modules/session/session.module';
import { UserSharedController } from 'src/modules/user/controllers/user.shared.controller';
import { UserModule } from 'src/modules/user/user.module';
import { CloudTasksQueueModule } from 'src/worker/cloud-tasks-queue.module';

@Module({
    controllers: [
        UserSharedController,
        AuthSharedController,
        CountrySharedController,
        SessionSharedController,
        PasswordHistorySharedController,
        ActivitySharedController,
        AccountController,
        ChatbotController,
    ],
    providers: [],
    exports: [],
    imports: [
        RequestsModule,
        UserModule,
        WorkSpaceModule,
        AccountModule,
        RoleModule,
        EmailModule.register(),
        AuthModule,
        AwsModule,
        CountryModule,
        SessionModule,
        ChatbotModule,
        ToolModule,
        PasswordHistoryModule,
        ActivityModule,
        ApiKeyModule,
        CloudTasksQueueModule,
    ],
})
export class RoutesSharedModule {}
