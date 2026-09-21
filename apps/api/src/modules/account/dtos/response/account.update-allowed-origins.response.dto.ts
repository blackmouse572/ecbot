import { ApiProperty } from '@nestjs/swagger';

export class AccountUpdateAllowedOriginsResponseDto {
    @ApiProperty({
        description: 'Account id',
        example: '820a8918-85e4-4582-8185-c2c3611d5ab8',
        required: true,
    })
    id: string;

    @ApiProperty({
        description: 'Public widget key used in the embed snippet',
        example: '2c3f0b6e-3a1d-4a2c-9f9d-2a1e5c7b41aa',
        required: true,
    })
    widgetKey: string;

    @ApiProperty({
        description: 'Normalised origins allowed to embed the widget',
        example: ['https://shop.example.com'],
        isArray: true,
        type: String,
        required: true,
    })
    allowedOrigins: string[];
}
