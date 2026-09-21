import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type { ApiPropertyOptions } from '@nestjs/swagger';
import { Expose } from 'class-transformer';
import { ENUM_TOOL_INVOCATION_STATUS } from 'src/modules/tool/enums/tool-invocation-status.enum';

export class ToolInvocationResponseDto {
    @Expose() @ApiProperty() id!: string;
    @Expose() @ApiProperty() toolId!: string;
    @Expose() @ApiProperty() chatbotId!: string;
    @Expose() @ApiPropertyOptional() conversationId?: string;
    @Expose() @ApiProperty() correlationId!: string;
    @Expose()
    @ApiProperty({ enum: ENUM_TOOL_INVOCATION_STATUS })
    status!: ENUM_TOOL_INVOCATION_STATUS;
    @Expose() @ApiPropertyOptional() actionName?: string;
    @Expose()
    @ApiProperty({
        type: 'object',
        additionalProperties: true,
    } as ApiPropertyOptions)
    inputArgs!: Record<string, unknown>;
    @Expose()
    @ApiPropertyOptional({
        type: 'object',
        additionalProperties: true,
    } as ApiPropertyOptions)
    outputResult?: unknown;
    @Expose() @ApiPropertyOptional() errorMessage?: string;
    @Expose() @ApiProperty() durationMs!: number;
    @Expose() @ApiProperty() createdAt!: Date;
}
