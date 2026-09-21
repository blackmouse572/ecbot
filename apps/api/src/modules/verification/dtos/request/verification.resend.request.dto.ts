import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class VerificationResendEmailRequestDto {
    @ApiProperty({
        required: false,
        example: 'Karianne_Boyle@gmail.com',
    })
    @IsString()
    @IsNotEmpty()
    @IsEmail()
    email: string;

    @ApiProperty({
        required: true,
        example: '2b1fcdcd-e4b4-4adb-b31d-f9db1fe03a5e',
    })
    @IsString()
    @IsNotEmpty()
    id: string;
}
