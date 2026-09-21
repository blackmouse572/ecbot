import { ApiProperty } from '@nestjs/swagger';

export class ResetPasswordCreteResponseDto {
    @ApiProperty({
        required: true,
        example: new Date('2026-08-30T05:29:50.057Z'),
    })
    expiredDate: Date;

    @ApiProperty({
        required: true,
        example: 'Muhammad_Satterfield17@hotmail.com',
    })
    to: string;

    @ApiProperty({
        required: true,
        example: 'bH3kQ8yD1sZ6nJf0',
    })
    token: string;

    @ApiProperty({
        required: true,
        example: 'https://variable-disk.info',
    })
    url: string;
}
