import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type { ApiPropertyOptions } from '@nestjs/swagger';
import { Expose, Transform } from 'class-transformer';
import { ENUM_TOOL_KIND } from 'src/modules/tool/enums/tool-kind.enum';
import { ENUM_TOOL_STATUS } from 'src/modules/tool/enums/tool-status.enum';
import { ENUM_MCP_PROVIDER } from 'src/modules/tool/enums/mcp-provider.enum';
import { DatabaseDto } from '@app/common/database/dtos/database.dto';

export class ToolResponseDto extends DatabaseDto {
    @Expose()
    @ApiProperty()
    id!: string;

    @Expose()
    @ApiProperty({ enum: ENUM_TOOL_KIND })
    kind!: ENUM_TOOL_KIND;

    @Expose()
    @ApiProperty()
    displayName!: string;

    // Backward-compatible alias; Phase 5 frontend will switch to displayName
    @Expose()
    @Transform(({ obj }) => (obj as any).displayName)
    @ApiProperty()
    name!: string;

    @Expose()
    @ApiProperty()
    slug!: string;

    @Expose()
    @ApiProperty()
    description!: string;

    @Expose()
    @ApiProperty({ enum: ENUM_TOOL_STATUS })
    status!: ENUM_TOOL_STATUS;

    @Expose()
    @ApiPropertyOptional({ type: 'object', additionalProperties: true } as any)
    source?: Record<string, unknown>;

    @Expose()
    @ApiProperty({ required: false })
    httpMethod?: string;

    @Expose()
    @ApiProperty({ required: false })
    httpUrl?: string;

    @Expose()
    @ApiPropertyOptional({
        type: 'object',
        additionalProperties: true,
    } as ApiPropertyOptions)
    httpInputSchema?: Record<string, unknown>;

    @Expose()
    @ApiPropertyOptional({
        type: 'object',
        additionalProperties: { type: 'string' },
    } as ApiPropertyOptions)
    httpHeaders?: Record<string, string>;

    @Expose()
    @ApiPropertyOptional({
        type: 'object',
        additionalProperties: true,
    } as ApiPropertyOptions)
    httpAuth?: Record<string, unknown>;

    @Expose()
    @ApiProperty({ required: false })
    timeoutMs?: number;

    @Expose()
    @ApiProperty({ required: false })
    maxRetries?: number;

    @Expose()
    @ApiProperty({ required: false, enum: ENUM_MCP_PROVIDER })
    mcpProvider?: ENUM_MCP_PROVIDER;

    @Expose()
    @ApiProperty({ required: false })
    mcpServerUrl?: string;

    @Expose()
    @ApiPropertyOptional({
        type: 'object',
        additionalProperties: true,
    } as ApiPropertyOptions)
    mcpAuth?: Record<string, unknown>;

    @Expose()
    @ApiProperty({ required: false, type: 'array' })
    discoveredActions?: unknown[];

    @Expose()
    @ApiProperty({ required: false })
    discoveryAt?: Date;
}
