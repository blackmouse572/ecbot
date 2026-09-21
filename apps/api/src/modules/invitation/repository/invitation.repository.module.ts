import { MikroOrmModule } from '@mikro-orm/nestjs';
import { Module } from '@nestjs/common';
import { InvitationEntity } from './entities/invitation.entity';
import { InvitationRepository } from './repositories/invitation.repository';

@Module({
    providers: [InvitationRepository],
    exports: [InvitationRepository],
    controllers: [],
    imports: [MikroOrmModule.forFeature([InvitationEntity])],
})
export class InvitationRepositoryModule {}
