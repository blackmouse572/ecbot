import { ApiProperty } from '@nestjs/swagger';

// Returned once at creation. `secret` is never persisted in plaintext and can
// never be retrieved again — the operator must copy it now. See ADR-0012.
export class ClientCredentialCreateResponseDto {
    @ApiProperty({
        description: 'Credential id',
        example: '820a8918-85e4-4582-8185-c2c3611d5ab8',
        required: true,
    })
    id: string;

    @ApiProperty({
        description: 'Public key part — sent as the first half of x-api-key',
        example: 'zCa6pmuBaZx149eHH1vXa1QLX',
        required: true,
    })
    key: string;

    @ApiProperty({
        description: 'Secret part — shown only once, never recoverable',
        example: 'fLqpaHJMpm6taTdL6MA6jtt6ZIX9Un8gYlT',
        required: true,
    })
    secret: string;
}
