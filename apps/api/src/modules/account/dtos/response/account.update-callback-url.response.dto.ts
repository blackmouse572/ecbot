import { ApiProperty } from '@nestjs/swagger';

export class AccountUpdateCallbackUrlResponseDto {
    @ApiProperty({
        description: 'Account id',
        example: '820a8918-85e4-4582-8185-c2c3611d5ab8',
        required: true,
    })
    id: string;

    @ApiProperty({
        description: 'Identifies this channel in the `accountKey` field of an inbound message',
        example: '2c3f0b6e-3a1d-4a2c-9f9d-2a1e5c7b41aa',
        required: true,
    })
    accountKey: string;

    @ApiProperty({
        description: 'Where bot replies are POSTed',
        example: 'https://partner.example.com/eccho/replies',
        required: true,
    })
    callbackUrl: string;
}
