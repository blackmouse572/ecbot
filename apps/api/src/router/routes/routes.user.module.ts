import { EmailModule } from '@app/modules/email/email.module';
import { NotificationSharedController } from '@app/modules/notification/controllers/notification.shared.controller';
import { Module } from '@nestjs/common';
import { ActivityModule } from 'src/modules/activity/activity.module';
import { ApiKeyModule } from 'src/modules/api-key/api-key.module';
import { AuthModule } from 'src/modules/auth/auth.module';
import { CountryModule } from 'src/modules/country/country.module';
import { NotificationModule } from 'src/modules/notification/notification.module';
import { SessionModule } from 'src/modules/session/session.module';
import { UserUserController } from 'src/modules/user/controllers/user.user.controller';
import { UserModule } from 'src/modules/user/user.module';
import { VerificationUserController } from 'src/modules/verification/controllers/verification.user.controller';
import { VerificationModule } from 'src/modules/verification/verification.module';
import { CloudTasksQueueModule } from 'src/worker/cloud-tasks-queue.module';

@Module({
    controllers: [
        UserUserController,
        VerificationUserController,
        NotificationSharedController,
    ],
    providers: [],
    exports: [],
    imports: [
        UserModule,
        AuthModule,
        ActivityModule,
        SessionModule,
        CountryModule,
        ApiKeyModule,
        VerificationModule,
        NotificationModule,
        EmailModule.register(),
        CloudTasksQueueModule,
    ],
})
export class RoutesUserModule {}
