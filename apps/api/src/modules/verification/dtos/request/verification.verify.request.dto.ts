import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString } from 'class-validator';
import { ResetPasswordVerifyRequestDto } from 'src/modules/reset-password/dtos/request/reset-password.verify.request.dto';

export class VerificationVerifyRequestDto extends ResetPasswordVerifyRequestDto {}

export class VerificationVerifyEmailRequestDto {
    @ApiProperty({
        required: false,
        example: 'Ubaldo60@yahoo.com',
    })
    @IsString()
    @IsNotEmpty()
    @IsEmail()
    email: string;

    @ApiProperty({
        required: true,
        example: 'a026636b-bb5a-455f-8adc-bd764afe3792',
    })
    @IsString()
    @IsNotEmpty()
    id: string;

    @ApiProperty({
        required: true,
        example: '058043',
    })
    @IsString()
    @IsNotEmpty()
    otp: string;
}
