import { Module } from '@nestjs/common';
import { WaitlistRepositoryModule } from 'src/modules/waitlist/repository/waitlist.repository.module';
import { WaitlistService } from 'src/modules/waitlist/services/waitlist.service';

@Module({
    imports: [WaitlistRepositoryModule],
    exports: [WaitlistService],
    providers: [WaitlistService],
    controllers: [],
})
export class WaitlistModule {}
