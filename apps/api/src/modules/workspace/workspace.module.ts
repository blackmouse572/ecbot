import { MessageModule } from '@app/common/message/message.module';
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ActivityModule } from '../activity/activity.module';
import { ApiKeyModule } from '../api-key/api-key.module';
import { AuthModule } from '../auth/auth.module';
import { AwsS3Service } from '../aws/services/aws.s3.service';
import { EmailModule } from '../email/email.module';
import { InvitationModule } from '../invitation/invitation.module';
import { NotificationModule } from '../notification/notification.module';
import { RequestRepositoryModule } from '../requests/repository/requests.repository.module';
import { RoleModule } from '../role/role.module';
import { UserModule } from '../user/user.module';
import { WorkspaceMemberController } from './controllers/workspace.member.controller';
import { WorkspaceController } from './controllers/workspace.owner.controller';
import { WorkspacePolicyGuard } from './guards/workspace.policy.guard';
import { WorkspaceRepositoryModule } from './repository/workspace.repository.module';
import { WorkspaceMemberService } from './services/workspace.member.service';
import { WorkspaceOwnerService } from './services/workspace.owner.service';
import { WorkspaceRequestService } from './services/workspace.request.service';
import { KnowledgeBaseServicesModule } from '../knowledge-base/services/services.module';
import { CustomerModule } from '../customer/customer.module';

@Module({
    imports: [
        ApiKeyModule,
        AuthModule,
        UserModule,
        WorkspaceRepositoryModule,
        EmailModule.register(),
        JwtModule,
        MessageModule,
        ActivityModule,
        NotificationModule,
        RoleModule,
        InvitationModule,
        RequestRepositoryModule,
        KnowledgeBaseServicesModule,
        CustomerModule,
    ],
    providers: [
        WorkspaceOwnerService,
        WorkspaceMemberService,
        WorkspaceRequestService,
        AwsS3Service,
        WorkspacePolicyGuard,
    ],
    controllers: [WorkspaceController, WorkspaceMemberController],
    exports: [
        WorkspaceOwnerService,
        WorkspaceMemberService,
        WorkspaceRequestService,
    ],
})
export class WorkSpaceModule {}
