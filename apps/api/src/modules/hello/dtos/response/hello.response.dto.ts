import { ApiProperty } from '@nestjs/swagger';

export class HelloResponseDto {
    @ApiProperty({
        required: true,
        example: new Date('2026-08-29T19:03:14.988Z'),
    })
    date: Date;

    @ApiProperty({
        required: true,
        example: new Date('2026-08-29T15:42:53.825Z'),
    })
    format: string;

    @ApiProperty({
        required: true,
        example: 1660190937231,
    })
    timestamp: number;
}
