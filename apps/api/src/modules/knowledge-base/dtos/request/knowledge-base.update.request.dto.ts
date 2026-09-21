import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsObject } from 'class-validator';

export class KnowledgeBaseUpdateRequestDto {
    @ApiPropertyOptional({
        description: 'Knowledge base name',
        example: 'Updated KB Name',
    })
    @IsOptional()
    @IsString()
    name?: string;

    @ApiPropertyOptional({
        description: 'Knowledge base description',
        example: 'Updated description',
    })
    @IsOptional()
    @IsString()
    description?: string;

    @ApiPropertyOptional({
        description: 'Knowledge base settings',
        example: { chunkSize: 2000 },
    })
    @IsOptional()
    @IsObject()
    settings?: Record<string, any>;
}
