import { MikroOrmModule } from '@mikro-orm/nestjs';
import { Module } from '@nestjs/common';
import { SessionEntity } from 'src/modules/session/repository/entities/session.entity';
import { SessionRepository } from 'src/modules/session/repository/repositories/session.repository';

@Module({
    providers: [SessionRepository],
    exports: [SessionRepository],
    controllers: [],
    imports: [MikroOrmModule.forFeature([SessionEntity])],
})
export class SessionRepositoryModule {}
