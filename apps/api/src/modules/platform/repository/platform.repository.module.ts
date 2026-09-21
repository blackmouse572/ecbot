import { MikroOrmModule } from '@mikro-orm/nestjs';
import { Module } from '@nestjs/common';
import { FollowupEntity } from './entities/followup.entity';
import { FollowupRepository } from './repositories/followup.repository';

@Module({
    providers: [FollowupRepository],
    exports: [FollowupRepository],
    controllers: [],
    imports: [MikroOrmModule.forFeature([FollowupEntity])],
})
export class PlatformRepositoryModule {}
