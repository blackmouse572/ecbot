import { ApiPropertyOptional } from '@nestjs/swagger';
import {
    IsBoolean,
    IsDate,
    IsObject,
    IsOptional,
    IsString,
} from 'class-validator';

export class FacebookActivityUpdateRequestDto {
    @ApiPropertyOptional({
        example: true,
        description: 'Whether processing already finished',
    })
    @IsOptional()
    @IsBoolean()
    processed?: boolean;

    @ApiPropertyOptional({
        example: 'Unsupported event payload',
        description: 'Why the last processing attempt failed',
    })
    @IsOptional()
    @IsString()
    processingError?: string;

    @ApiPropertyOptional({
        example: new Date('2026-09-20T09:15:00.000Z'),
        description: 'When processing finished',
    })
    @IsOptional()
    @IsDate()
    processedAt?: Date;

    @ApiPropertyOptional({
        type: Object,
        description: 'Extra metadata',
    })
    @IsOptional()
    @IsObject()
    metadata?: Record<string, any>;
}
