import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type { ApiPropertyOptions } from '@nestjs/swagger';
import { IsObject, IsOptional, IsString, IsUUID } from 'class-validator';

export class ExecuteToolRequestDto {
    @ApiProperty()
    @IsString()
    toolId!: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    actionName?: string;

    @ApiProperty({
        type: 'object',
        additionalProperties: true,
    } as ApiPropertyOptions)
    @IsObject()
    args!: Record<string, unknown>;

    @ApiProperty()
    @IsUUID()
    chatbotId!: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsUUID()
    conversationId?: string;

    @ApiProperty()
    @IsString()
    correlationId!: string;
}
