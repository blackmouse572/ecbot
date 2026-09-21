import { MessageModule } from '@app/common/message/message.module';
import { Module } from '@nestjs/common';
import { ActivityModule } from '../activity/activity.module';
import { ApiKeyModule } from '../api-key/api-key.module';
import { AuthModule } from '../auth/auth.module';
import { NotificationModule } from '../notification/notification.module';
import { UserModule } from '../user/user.module';
import { WorkSpaceModule } from '../workspace/workspace.module';
import { RequestController } from './controllers/requests.controller';
import { RequestRepositoryModule } from './repository/requests.repository.module';
import { RequestService } from './services/requests.service';

@Module({
    imports: [
        RequestRepositoryModule,
        UserModule,
        NotificationModule,
        AuthModule,
        ApiKeyModule,
        ActivityModule,
        MessageModule,
        WorkSpaceModule,
    ],
    controllers: [RequestController],
    providers: [RequestService],
    exports: [RequestService, RequestRepositoryModule],
})
export class RequestsModule {}
