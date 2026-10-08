import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, Matches } from 'class-validator';

export class AuthMfaEnableRequestDto {
    @ApiProperty({
        required: true,
        description: '6-digit code from the authenticator app',
        example: '123456',
    })
    @IsString()
    @IsNotEmpty()
    @Matches(/^\d{6}$/)
    code: string;
}
