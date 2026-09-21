import { ConversationRepositoryModule } from '@app/modules/conversation/repository/conversation.repository.module';
import { AccountModule } from '@app/modules/account/account.module';
import { PlatformWebhookPublicController } from '@app/modules/platform/controllers/platform-webhook.public.controller';
import { WidgetPublicController } from '@app/modules/platform/controllers/widget.public.controller';
import { PlatformModule } from '@app/modules/platform/platform.module';
import { RequestsModule } from '@app/modules/requests/requests.module';
import { VerificationEmailController } from '@app/modules/verification/controllers/verification.email.controller';
import { WorkSpaceModule } from '@app/modules/workspace/workspace.module';
import { Module } from '@nestjs/common';
import { TurnstileModule } from 'src/common/turnstile/turnstile.module';
import { ActivityModule } from 'src/modules/activity/activity.module';
import { ApiKeyModule } from 'src/modules/api-key/api-key.module';
import { AuthModule } from 'src/modules/auth/auth.module';
import { AuthPublicController } from 'src/modules/auth/controllers/auth.public.controller';
import { ChatbotPreviewPublicController } from 'src/modules/chatbot/controllers/chatbot-preview.public.controller';
import { ChatbotModule } from 'src/modules/chatbot/chatbot.module';
import { CountryModule } from 'src/modules/country/country.module';
import { EmailModule } from 'src/modules/email/email.module';
import { HealthPublicController } from 'src/modules/health/controllers/health.public.controller';
import { HealthModule } from 'src/modules/health/health.module';
import { HelloPublicController } from 'src/modules/hello/controllers/hello.public.controller';
import { PasswordHistoryModule } from 'src/modules/password-history/password-history.module';
import { ResetPasswordPublicController } from 'src/modules/reset-password/controllers/reset-password.public.controller';
import { ResetPasswordModule } from 'src/modules/reset-password/reset-password.module';
import { RoleModule } from 'src/modules/role/role.module';
import { SessionModule } from 'src/modules/session/session.module';
import { SettingModule } from 'src/modules/setting/setting.module';
import { UserModule } from 'src/modules/user/user.module';
import { VerificationModule } from 'src/modules/verification/verification.module';
import { WaitlistPublicController } from 'src/modules/waitlist/controllers/waitlist.public.controller';
import { WaitlistModule } from 'src/modules/waitlist/waitlist.module';
import { CloudTasksQueueModule } from 'src/worker/cloud-tasks-queue.module';

@Module({
    controllers: [
        HelloPublicController,
        AuthPublicController,
        ResetPasswordPublicController,
        VerificationEmailController,
        PlatformWebhookPublicController,
        WidgetPublicController,
        HealthPublicController,
        WaitlistPublicController,
        ChatbotPreviewPublicController,
    ],
    providers: [],
    exports: [],
    imports: [
        HealthModule,
        RequestsModule,
        WorkSpaceModule,
        SettingModule,
        UserModule,
        AuthModule,
        RoleModule,
        EmailModule.register(),
        CountryModule,
        PasswordHistoryModule,
        SessionModule,
        ActivityModule,
        ResetPasswordModule,
        VerificationModule,
        ApiKeyModule,
        TurnstileModule,
        PlatformModule,
        ConversationRepositoryModule,
        AccountModule,
        WaitlistModule,
        ChatbotModule,
        CloudTasksQueueModule,
    ],
})
export class RoutesPublicModule {}
