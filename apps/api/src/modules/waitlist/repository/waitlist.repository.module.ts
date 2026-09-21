import { MikroOrmModule } from '@mikro-orm/nestjs';
import { Module } from '@nestjs/common';
import { WaitlistEntity } from 'src/modules/waitlist/repository/entities/waitlist.entity';
import { WaitlistRepository } from 'src/modules/waitlist/repository/repositories/waitlist.repository';

@Module({
    providers: [WaitlistRepository],
    exports: [WaitlistRepository],
    controllers: [],
    imports: [MikroOrmModule.forFeature([WaitlistEntity])],
})
export class WaitlistRepositoryModule {}
