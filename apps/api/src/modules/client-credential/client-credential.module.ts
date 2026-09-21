import { Module } from '@nestjs/common';
import { WorkSpaceModule } from '../workspace/workspace.module';
import { ClientCredentialRepositoryModule } from './repository/client-credential.repository.module';
import { ClientCredentialService } from './services/client-credential.service';

@Module({
    imports: [ClientCredentialRepositoryModule, WorkSpaceModule],
    exports: [ClientCredentialService],
    providers: [ClientCredentialService],
    controllers: [],
})
export class ClientCredentialModule {}
