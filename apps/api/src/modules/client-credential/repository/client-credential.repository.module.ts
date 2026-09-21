import { MikroOrmModule } from '@mikro-orm/nestjs';
import { Module } from '@nestjs/common';
import { ClientCredentialEntity } from 'src/modules/client-credential/repository/entities/client-credential.entity';
import { ClientCredentialRepository } from 'src/modules/client-credential/repository/repositories/client-credential.repository';

@Module({
    providers: [ClientCredentialRepository],
    exports: [ClientCredentialRepository],
    controllers: [],
    imports: [MikroOrmModule.forFeature([ClientCredentialEntity])],
})
export class ClientCredentialRepositoryModule {}
