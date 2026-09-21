import { Module } from '@nestjs/common';
import { SessionRepositoryModule } from 'src/modules/session/repository/session.repository.module';
import { SessionRevokeSweepScheduler } from 'src/modules/session/schedulers/session-revoke.sweep.scheduler';
import { SessionService } from 'src/modules/session/services/session.service';

@Module({
    imports: [SessionRepositoryModule],
    exports: [SessionService],
    providers: [SessionService, SessionRevokeSweepScheduler],
    controllers: [],
})
export class SessionModule {}
