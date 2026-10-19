import { Module } from '@nestjs/common';
import { NotificationRepositoryModule } from './repository/notification.repository.module';
import { NotificationPushService } from './services/notification.push.service';
import { NotificationService } from './services/notification.service';

@Module({
    imports: [NotificationRepositoryModule],
    providers: [NotificationService, NotificationPushService],
    exports: [NotificationService, NotificationPushService],
})
export class NotificationModule {}
