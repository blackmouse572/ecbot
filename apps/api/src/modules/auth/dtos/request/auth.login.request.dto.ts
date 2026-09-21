import { ApiProperty } from '@nestjs/swagger';
import {
    IsBoolean,
    IsEmail,
    IsNotEmpty,
    IsOptional,
    IsString,
} from 'class-validator';

export class AuthLoginRequestDto {
    @ApiProperty({
        required: true,
        example: 'jane.doe@example.com',
    })
    @IsString()
    @IsNotEmpty()
    @IsEmail()
    email: string;

    @ApiProperty({
        description: 'string password',
        required: true,
        example: 'rJMss9bO7J',
    })
    @IsString()
    @IsNotEmpty()
    password: string;

    @ApiProperty({
        required: false,
        description: 'Cloudflare Turnstile token, verified server-side',
    })
    @IsOptional()
    @IsString()
    turnstileToken?: string;

    @ApiProperty({
        required: false,
        default: false,
        description:
            'Keep the session across browser restarts (persistent refresh-token cookie) instead of ending it when the browser closes',
    })
    @IsOptional()
    @IsBoolean()
    rememberMe?: boolean;
}
