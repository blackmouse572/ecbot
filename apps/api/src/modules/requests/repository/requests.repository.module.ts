import { MikroOrmModule } from '@mikro-orm/nestjs';
import { Module } from '@nestjs/common';
import { RequestEntity } from './entities/requests.entity';
import { RequestRepository } from './repositories/requests.repository';

@Module({
    providers: [RequestRepository],
    exports: [RequestRepository],
    imports: [MikroOrmModule.forFeature([RequestEntity])],
})
export class RequestRepositoryModule {}
