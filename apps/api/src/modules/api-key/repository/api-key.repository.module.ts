import { MikroOrmModule } from '@mikro-orm/nestjs';
import { Module } from '@nestjs/common';
import { ApiKeyEntity } from 'src/modules/api-key/repository/entities/api-key.entity';
import { ApiKeyRepository } from 'src/modules/api-key/repository/repositories/api-key.repository';

@Module({
    providers: [ApiKeyRepository],
    exports: [ApiKeyRepository],
    controllers: [],
    imports: [MikroOrmModule.forFeature([ApiKeyEntity])],
})
export class ApiKeyRepositoryModule {}
