import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, Length } from 'class-validator';

export class AuthLoginMfaRequestDto {
    @ApiProperty({
        required: true,
        description: 'The mfaToken returned by a login endpoint',
    })
    @IsString()
    @IsNotEmpty()
    @Length(20, 128)
    mfaToken: string;

    @ApiProperty({
        required: true,
        description: '6-digit authenticator code, or a recovery code',
        example: '123456',
    })
    @IsString()
    @IsNotEmpty()
    @Length(6, 32)
    code: string;
}
