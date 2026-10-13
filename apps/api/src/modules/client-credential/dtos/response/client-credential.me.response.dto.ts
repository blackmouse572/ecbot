import { ApiProperty } from '@nestjs/swagger';
import { RolePermissionDto } from 'src/modules/role/dtos/role.permission.dto';

// What a 3rd-party client sees at GET /client/me: the workspace its
// credential resolves to, and what the credential may do there.
export class ClientCredentialMeResponseDto {
    @ApiProperty({
        description: 'Workspace id the credential belongs to',
        example: 'ab4ebe73-2ad4-4669-818e-f006225cd317',
        required: true,
    })
    workspaceId: string;

    @ApiProperty({
        description: 'Workspace name',
        example: 'Doyle, VonRueden and Franey',
        required: true,
    })
    name: string;

    @ApiProperty({
        description: 'Workspace slug',
        example: 'Cronin-McClure-and-Reichert',
        required: true,
    })
    slug: string;

    @ApiProperty({
        description:
            'What the credential may do: the abilities its creator has in the workspace now, one entry per subject with every allowed action',
        type: RolePermissionDto,
        isArray: true,
        required: true,
    })
    permissions: RolePermissionDto[];
}
