import { ApiProperty } from '@nestjs/swagger';

export class EmailVerificationDto {
    @ApiProperty({
        required: true,
        description: 'The OTP code',
    })
    otp: string;

    @ApiProperty({
        required: true,
        example: new Date('2026-12-25T09:27:11.424Z'),
        description: 'Expired at by date',
    })
    expiredAt: Date;

    @ApiProperty({
        required: true,
    })
    reference: string;
}
