import { MikroOrmModule } from '@mikro-orm/nestjs';
import { Module } from '@nestjs/common';
import { NotificationEntity } from './entities/notification.entity';
import { NotificationRepository } from './repositories/notification.repository';

@Module({
    providers: [NotificationRepository],
    exports: [NotificationRepository],
    imports: [MikroOrmModule.forFeature([NotificationEntity])],
})
export class NotificationRepositoryModule {}
