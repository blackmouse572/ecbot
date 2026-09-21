import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
    ArrayMaxSize,
    ArrayNotEmpty,
    IsArray,
    IsNotEmpty,
    IsOptional,
    IsString,
    MaxLength,
    ValidateNested,
} from 'class-validator';

export class WidgetThemeRequestDto {
    @ApiPropertyOptional({ description: 'Launcher colour', example: '#0f766e' })
    @IsOptional()
    @IsString()
    @MaxLength(32)
    primaryColor?: string;

    @ApiPropertyOptional({
        description: 'Label shown on the launcher bubble',
        example: 'Chat with us',
    })
    @IsOptional()
    @IsString()
    @MaxLength(64)
    launcherText?: string;
}

export class AccountProvisionWebsiteWidgetRequestDto {
    @ApiProperty({
        description: 'Human-friendly name for this widget',
        example: 'Storefront widget',
        required: true,
    })
    @IsNotEmpty()
    @IsString()
    @MaxLength(255)
    name: string;

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

    @ApiPropertyOptional({ description: 'Launcher and window styling' })
    @IsOptional()
    @ValidateNested()
    @Type(() => WidgetThemeRequestDto)
    theme?: WidgetThemeRequestDto;
}
