import { Module } from '@nestjs/common';
import { NotificationRepositoryModule } from './repository/notification.repository.module';
import { NotificationService } from './services/notification.service';

@Module({
    imports: [NotificationRepositoryModule],
    providers: [NotificationService],
    exports: [NotificationService],
})
export class NotificationModule {}
