import { OAuthModule } from '@app/common/oauth/oauth.module';
import { AccountRepositoryModule } from '@app/modules/account/repository/account.repository.module';
import { AccountService } from '@app/modules/account/services/account.service';
import { ChatbotModule } from '@app/modules/chatbot/chatbot.module';
import { NotificationModule } from '@app/modules/notification/notification.module';
import { CloudTasksQueueModule } from '@app/worker/cloud-tasks-queue.module';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { AccountTokenRefreshScheduler } from './schedulers/account-token-refresh.scheduler';
import { AccountProvisionService } from './services/account-provision.service';

@Module({
    imports: [
        AccountRepositoryModule,
        OAuthModule,
        ChatbotModule,
        ConfigModule,
        ScheduleModule.forRoot(),
        NotificationModule,
        CloudTasksQueueModule,
    ],
    exports: [AccountService, AccountProvisionService],
    providers: [
        AccountService,
        AccountProvisionService,
        AccountTokenRefreshScheduler,
    ],
    controllers: [],
})
export class AccountModule {}
