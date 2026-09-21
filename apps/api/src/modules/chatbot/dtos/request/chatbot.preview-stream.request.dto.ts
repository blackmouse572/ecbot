import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
    IsDefined,
    IsNotEmpty,
    IsOptional,
    IsString,
    Matches,
    MaxLength,
} from 'class-validator';

export class ChatbotPreviewStreamRequestDto {
    @ApiProperty({
        description: 'The signed share token from the public preview link',
    })
    // Carried in the body, not the path: this token is a bearer credential for
    // the LLM budget, and paths land in access logs and error breadcrumbs.
    @IsDefined()
    @IsNotEmpty()
    @IsString()
    token: string;

    @ApiProperty({ example: 'Xin chào, shop có ship COD không?' })
    @IsDefined()
    @IsNotEmpty()
    @IsString()
    @MaxLength(2000)
    message: string;

    @ApiPropertyOptional({ example: 'ETDBmNUSBlXcVcLz' })
    @IsOptional()
    // The AI SDK's `useChat` mints this id itself and it is NOT a UUID (it is a
    // short nanoid, e.g. "ETDBmNUSBlXcVcLz"). The value is sha256-hashed before
    // it becomes a Redis key, so this bounds the input rather than protecting
    // the key space.
    @Matches(/^[A-Za-z0-9_-]{1,64}$/)
    chat_session_id?: string;

    @ApiPropertyOptional({
        description:
            'Cloudflare Turnstile token. Required on the first turn of a session; later turns reuse the verification stored against the session.',
    })
    @IsOptional()
    @IsString()
    turnstileToken?: string;
}
