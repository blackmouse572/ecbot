import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
    IsEmail,
    IsNotEmpty,
    IsOptional,
    IsString,
    MaxLength,
} from 'class-validator';

export class WaitlistJoinRequestDto {
    @ApiProperty({
        required: true,
        description: 'Email to add to the waitlist',
        example: 'Ardith_Koelpin56@yahoo.com',
        maxLength: 320,
    })
    @IsNotEmpty()
    @IsEmail()
    @MaxLength(320)
    @Transform(({ value }) =>
        typeof value === 'string' ? value.trim().toLowerCase() : value
    )
    email: string;

    @ApiProperty({
        required: false,
        description: 'Page or campaign the signup came from',
        example: 'hero',
        maxLength: 100,
    })
    @IsOptional()
    @IsString()
    @MaxLength(100)
    source?: string;

    @ApiProperty({
        required: false,
        description: 'Locale of the page the signup came from',
        example: 'vi',
        maxLength: 10,
    })
    @IsOptional()
    @IsString()
    @MaxLength(10)
    locale?: string;

    @ApiProperty({
        required: false,
        description: 'Cloudflare Turnstile token, verified server-side',
    })
    @IsOptional()
    @IsString()
    turnstileToken?: string;
}
