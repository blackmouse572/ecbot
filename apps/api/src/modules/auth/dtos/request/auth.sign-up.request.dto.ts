import { ApiProperty, OmitType } from '@nestjs/swagger';
import {
    IsNotEmpty,
    IsOptional,
    IsString,
    MaxLength,
    MinLength,
} from 'class-validator';
import { IsPassword } from 'src/common/request/validations/request.is-password.validation';
import { IsTermsAccepted } from 'src/common/request/validations/request.is-terms-accepted.validation';
import { UserCreateRequestDto } from 'src/modules/user/dtos/request/user.create.request.dto';

export class AuthSignUpRequestDto extends OmitType(UserCreateRequestDto, [
    'role',
    'gender',
] as const) {
    @ApiProperty({
        description: 'string password',
        example: 'krkceKRKCE@@!123',
        required: true,
        maxLength: 50,
        minLength: 8,
    })
    @IsNotEmpty()
    @IsPassword()
    @MinLength(8)
    @MaxLength(50)
    password: string;

    @ApiProperty({
        required: false,
        description: 'Cloudflare Turnstile token, verified server-side',
    })
    @IsOptional()
    @IsString()
    turnstileToken?: string;

    @ApiProperty({
        required: true,
        example: true,
        description:
            'Must be true: the user accepts the Terms of Service and Privacy Policy',
    })
    @IsTermsAccepted()
    acceptTerms: boolean;
}
