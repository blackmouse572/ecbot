import { MessageModule } from '@app/common/message/message.module';
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { InvitationRepositoryModule } from './repository/invitation.repository.module';
import { InvitationService } from './services/invitation.service';

@Module({
    imports: [InvitationRepositoryModule, JwtModule, MessageModule],
    providers: [InvitationService],
    exports: [InvitationService],
})
export class InvitationModule {}
