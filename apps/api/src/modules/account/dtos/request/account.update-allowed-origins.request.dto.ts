import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
    ArrayMaxSize,
    ArrayNotEmpty,
    IsArray,
    IsOptional,
    IsString,
    IsUrl,
    MaxLength,
} from 'class-validator';

export class AccountUpdateAllowedOriginsRequestDto {
    @ApiProperty({
        description:
            'Sites allowed to embed this widget. Enforced as a frame-ancestors CSP on the widget page.',
        example: ['https://shop.example.com'],
        isArray: true,
        type: String,
        required: true,
    })
    @IsArray()
    // An empty list would embed nowhere, which is never what an operator means.
    @ArrayNotEmpty()
    @ArrayMaxSize(50)
    @IsString({ each: true })
    allowedOrigins: string[];

    @ApiPropertyOptional({
        description:
            "The business's own privacy policy, linked from the widget's AI notice instead of Ecbot's. Omit to keep, null to clear.",
        example: 'https://shop.example.com/privacy',
        nullable: true,
        type: String,
    })
    @IsOptional()
    // HTTPS only: it is rendered as a link visitors click.
    @IsUrl({ protocols: ['https'], require_protocol: true })
    @MaxLength(2000)
    privacyPolicyUrl?: string | null;
}
