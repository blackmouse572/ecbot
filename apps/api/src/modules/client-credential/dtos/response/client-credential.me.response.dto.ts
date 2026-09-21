import { ApiProperty } from '@nestjs/swagger';

// What a 3rd-party client sees at GET /client/me — the workspace its
// credential resolves to. Proves the x-api-key guard derived the tenant.
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
}
