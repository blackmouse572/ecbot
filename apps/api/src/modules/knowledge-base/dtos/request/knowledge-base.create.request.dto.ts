import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsOptional, IsObject } from 'class-validator';

export class KnowledgeBaseCreateRequestDto {
    @ApiProperty({
        description: 'Knowledge base name',
        example: 'Customer Support KB',
    })
    @IsNotEmpty()
    @IsString()
    name: string;

    @ApiPropertyOptional({
        description: 'Knowledge base description',
        example: 'Contains FAQs and support documentation',
    })
    @IsOptional()
    @IsString()
    description?: string;

    @ApiPropertyOptional({
        description: 'Knowledge base settings as JSON',
        example: { chunkSize: 1000, processingMethod: 'FULL_HTML' },
    })
    @IsOptional()
    @IsObject()
    settings?: Record<string, any>;
}
