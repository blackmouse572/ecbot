import { ClientCredentialModule } from '@app/modules/client-credential/client-credential.module';
import { ClientCredentialClientController } from '@app/modules/client-credential/controllers/client-credential.client.controller';
import { PlatformModule } from '@app/modules/platform/platform.module';
import { ApiChannelClientController } from '@app/modules/platform/controllers/api-channel.client.controller';
import { AccountModule } from '@app/modules/account/account.module';
import { Module } from '@nestjs/common';

// 3rd-party surface — every controller here authenticates via x-api-key
// (ClientCredential) and derives its workspace from the credential. See ADR-0012.
@Module({
    controllers: [ClientCredentialClientController, ApiChannelClientController],
    providers: [],
    exports: [],
    imports: [ClientCredentialModule, PlatformModule, AccountModule],
})
export class RoutesClientModule {}
