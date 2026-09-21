import { applyDecorators } from '@nestjs/common';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type { ApiPropertyOptions } from '@nestjs/swagger';
import {
    Doc,
    DocAuth,
    DocRequest,
    DocResponse,
} from 'src/common/doc/decorators/doc.decorator';
import { ENUM_DOC_REQUEST_BODY_TYPE } from 'src/common/doc/enums/doc.enum';
import { ExecuteToolRequestDto } from 'src/modules/tool/dtos/request/execute-tool.request.dto';
import { ENUM_TOOL_INVOCATION_STATUS } from 'src/modules/tool/enums/tool-invocation-status.enum';

export class ToolExecuteResponseDto {
    @ApiProperty() invocationId!: string;
    @ApiProperty({ enum: ENUM_TOOL_INVOCATION_STATUS })
    status!: ENUM_TOOL_INVOCATION_STATUS;
    @ApiPropertyOptional({
        type: 'object',
        additionalProperties: true,
    } as ApiPropertyOptions)
    result?: unknown;
    @ApiPropertyOptional() errorMessage?: string;
    @ApiProperty() durationMs!: number;
}

export function ToolSystemExecuteDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'Execute a tool (system-to-system from apps/ai)',
        }),
        DocAuth({ xApiKey: true }),
        DocRequest({
            bodyType: ENUM_DOC_REQUEST_BODY_TYPE.JSON,
            dto: ExecuteToolRequestDto,
        }),
        DocResponse<ToolExecuteResponseDto>('tool.execute.success', {
            dto: ToolExecuteResponseDto,
        })
    );
}
