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
}
