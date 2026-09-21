import { Response } from '@app/common/response/decorators/response.decorator';
import { IResponse } from '@app/common/response/interfaces/response.interface';
import { WorkspacePayload } from '@app/modules/workspace/decorators/workspace.decorator';
import { WorkspaceEntity } from '@app/modules/workspace/repository/entities/workspace.entity';
import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ClientCredentialProtected } from '../decorators/client-credential.decorator';
import { ClientCredentialMeDoc } from '../docs/client-credential.client.doc';
import { ClientCredentialMeResponseDto } from '../dtos/response/client-credential.me.response.dto';

// 3rd-party surface — authenticated by x-api-key (ClientCredential), tenant
// derived from the credential (no :workspace param). See ADR-0012.
@ApiTags('modules.client.clientCredential')
@Controller({
    version: '1',
    path: '/',
})
export class ClientCredentialClientController {
    @ClientCredentialMeDoc()
    @Response('clientCredential.me')
    @ClientCredentialProtected()
    @Get('/me')
    async me(
        @WorkspacePayload() workspace: WorkspaceEntity
    ): Promise<IResponse<ClientCredentialMeResponseDto>> {
        return {
            data: {
                workspaceId: workspace.id,
                name: workspace.name,
                slug: workspace.slug,
            },
        };
    }
}
