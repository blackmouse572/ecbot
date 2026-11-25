import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { IsPassword } from 'src/common/request/validations/request.is-password.validation';

export class AuthAdminUpdatePasswordRequestDto {
    @ApiProperty({
        description:
            'Password the admin typed. Leave it out to generate a temporary one',
        example: 'gq0ewGQ0EW@@!123',
        required: false,
        minLength: 8,
        maxLength: 50,
    })
    @IsOptional()
    @IsString()
    @IsPassword()
    @MinLength(8)
    @MaxLength(50)
    password?: string;
}
