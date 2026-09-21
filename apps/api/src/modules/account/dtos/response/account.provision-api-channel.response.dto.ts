import { ApiProperty } from '@nestjs/swagger';

/**
 * Returned once at provision and again only on rotate. `signingSecret` is stored
 * encrypted and is never read back out — a lost secret is rotated, not
 * re-revealed (same posture as ClientCredential, ADR-0012).
 */
export class AccountProvisionApiChannelResponseDto {
    @ApiProperty({
        description: 'Account id',
        example: '820a8918-85e4-4582-8185-c2c3611d5ab8',
        required: true,
    })
    id: string;

    @ApiProperty({
        description:
            'Identifies this channel in the `accountKey` field of an inbound message. Not a secret.',
        example: '2c3f0b6e-3a1d-4a2c-9f9d-2a1e5c7b41aa',
        required: true,
    })
    accountKey: string;

    @ApiProperty({
        description:
            'HMAC key for verifying x-eccho-signature on callbacks. Shown once, never recoverable.',
        example: 'fLqpaHJMpm6taTdL6MA6jtt6ZIX9Un8gYlT',
        required: true,
    })
    signingSecret: string;

    @ApiProperty({
        description: 'Where bot replies are POSTed',
        example: 'https://partner.example.com/eccho/replies',
        required: true,
    })
    callbackUrl: string;
}
