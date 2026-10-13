import { Module } from '@nestjs/common';
import { RoleModule } from '../role/role.module';
import { WorkSpaceModule } from '../workspace/workspace.module';
import { ClientCredentialRepositoryModule } from './repository/client-credential.repository.module';
import { ClientCredentialPolicyService } from './services/client-credential.policy.service';
import { ClientCredentialService } from './services/client-credential.service';

@Module({
    imports: [ClientCredentialRepositoryModule, WorkSpaceModule, RoleModule],
    exports: [ClientCredentialService, ClientCredentialPolicyService],
    providers: [ClientCredentialService, ClientCredentialPolicyService],
    controllers: [],
})
export class ClientCredentialModule {}
