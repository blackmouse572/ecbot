import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, MaxLength, MinLength } from 'class-validator';
import { IsPassword } from 'src/common/request/validations/request.is-password.validation';

export class AuthChangePasswordRequestDto {
    @ApiProperty({
        description:
            "new string password, newPassword can't same with oldPassword",
        example: 'gq0ewGQ0EW@@!123',
        required: true,
        minLength: 8,
        maxLength: 50,
    })
    @IsNotEmpty()
    @IsString()
    @IsPassword()
    @MinLength(8)
    @MaxLength(50)
    newPassword: string;

    @ApiProperty({
        description: 'old string password',
        example: '4p5yr4P5YR@@!123',
        required: true,
    })
    @IsString()
    @IsNotEmpty()
    oldPassword: string;
}
