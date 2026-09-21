import { WorkspaceDocParamsId } from '@app/modules/workspace/constants/workspace.doc.constant';
import { HttpStatus, applyDecorators } from '@nestjs/common';
import { BatchIdsRequestDto } from 'src/common/batch/dtos/batch.request.dto';
import { BatchResultResponseDto } from 'src/common/batch/dtos/batch.response.dto';
import { DatabaseIdResponseDto } from 'src/common/database/dtos/response/database.id.response.dto';
import {
    Doc,
    DocAuth,
    DocGuard,
    DocRequest,
    DocResponse,
    DocResponsePaging,
} from 'src/common/doc/decorators/doc.decorator';
import { ENUM_DOC_REQUEST_BODY_TYPE } from 'src/common/doc/enums/doc.enum';
import { CreateHttpToolRequestDto } from 'src/modules/tool/dtos/request/create-http-tool.request.dto';
import { CreateMcpToolRequestDto } from 'src/modules/tool/dtos/request/create-mcp-tool.request.dto';
import { UpdateToolRequestDto } from 'src/modules/tool/dtos/request/update-tool.request.dto';
import {
    TestSavedToolRequestDto,
    TestInlineToolRequestDto,
} from 'src/modules/tool/dtos/request/test-tool.request.dto';
import { ToolListResponseDto } from 'src/modules/tool/dtos/response/tool.list.response.dto';
import { ToolResponseDto } from 'src/modules/tool/dtos/response/tool.response.dto';
import { ToolTestResponseDto } from 'src/modules/tool/dtos/response/tool-test.response.dto';

export function ToolWorkspaceListDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'list all tools in workspace',
        }),
        DocAuth({
            xApiKey: true,
            jwtAccessToken: true,
        }),
        DocGuard({ role: true, policy: true }),
        DocResponsePaging<ToolListResponseDto>('tool.list.success', {
            dto: ToolListResponseDto,
        })
    );
}

export function ToolWorkspaceGetDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'get one tool',
        }),
        DocAuth({
            xApiKey: true,
            jwtAccessToken: true,
        }),
        DocGuard({ role: true, policy: true }),
        DocRequest({
            params: [{ name: 'toolId' }],
        }),
        DocResponse<ToolResponseDto>('tool.get.success', {
            dto: ToolResponseDto,
        })
    );
}

export function ToolWorkspaceCreateHttpDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'create an HTTP tool',
        }),
        DocAuth({
            xApiKey: true,
            jwtAccessToken: true,
        }),
        DocGuard({ role: true, policy: true }),
        DocRequest({
            bodyType: ENUM_DOC_REQUEST_BODY_TYPE.JSON,
            dto: CreateHttpToolRequestDto,
        }),
        DocResponse<DatabaseIdResponseDto>('tool.create.success', {
            httpStatus: HttpStatus.CREATED,
            dto: DatabaseIdResponseDto,
        })
    );
}

export function ToolWorkspaceCreateMcpDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'create an operator-supplied MCP tool',
        }),
        DocAuth({
            xApiKey: true,
            jwtAccessToken: true,
        }),
        DocGuard({ role: true, policy: true }),
        DocRequest({
            bodyType: ENUM_DOC_REQUEST_BODY_TYPE.JSON,
            dto: CreateMcpToolRequestDto,
        }),
        DocResponse<DatabaseIdResponseDto>('tool.create.success', {
            httpStatus: HttpStatus.CREATED,
            dto: DatabaseIdResponseDto,
        })
    );
}

export function ToolWorkspaceUpdateDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'update a tool',
        }),
        DocAuth({
            xApiKey: true,
            jwtAccessToken: true,
        }),
        DocGuard({ role: true, policy: true }),
        DocRequest({
            params: [{ name: 'toolId' }],
            bodyType: ENUM_DOC_REQUEST_BODY_TYPE.JSON,
            dto: UpdateToolRequestDto,
        }),
        DocResponse<DatabaseIdResponseDto>('tool.update.success', {
            dto: DatabaseIdResponseDto,
        })
    );
}

export function ToolWorkspaceDeleteDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'delete a tool',
        }),
        DocAuth({
            xApiKey: true,
            jwtAccessToken: true,
        }),
        DocGuard({ role: true, policy: true }),
        DocRequest({
            params: [{ name: 'toolId' }],
        }),
        DocResponse<DatabaseIdResponseDto>('tool.delete.success', {
            dto: DatabaseIdResponseDto,
        })
    );
}

export function ToolWorkspaceDiscoverDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary:
                're-run MCP discovery for a tool (rate-limited: 5 per minute)',
        }),
        DocAuth({
            xApiKey: true,
            jwtAccessToken: true,
        }),
        DocGuard({ role: true, policy: true }),
        DocRequest({
            params: [{ name: 'toolId' }],
        }),
        DocResponse<ToolResponseDto>('tool.discover.success', {
            dto: ToolResponseDto,
        })
    );
}

export function ToolWorkspaceTestSavedDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'test an existing HTTP tool (rate-limited: 5/min)',
        }),
        DocAuth({
            xApiKey: true,
            jwtAccessToken: true,
        }),
        DocGuard({ role: true, policy: true }),
        DocRequest({
            params: [{ name: 'toolId' }],
            bodyType: ENUM_DOC_REQUEST_BODY_TYPE.JSON,
            dto: TestSavedToolRequestDto,
        }),
        DocResponse<ToolTestResponseDto>('tool.test.success', {
            dto: ToolTestResponseDto,
        })
    );
}

export function ToolWorkspaceTestInlineDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary:
                'test an HTTP tool config inline without saving (rate-limited: 5/min)',
        }),
        DocAuth({
            xApiKey: true,
            jwtAccessToken: true,
        }),
        DocGuard({ role: true, policy: true }),
        DocRequest({
            bodyType: ENUM_DOC_REQUEST_BODY_TYPE.JSON,
            dto: TestInlineToolRequestDto,
        }),
        DocResponse<ToolTestResponseDto>('tool.test.success', {
            dto: ToolTestResponseDto,
        })
    );
}

export function ToolWorkspaceBatchDeleteDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'delete several tools',
            description:
                'Soft delete every tool in `ids`. Each id is processed independently: a tool still enabled on a chatbot is reported in `failed` while the rest are deleted.',
        }),
        DocAuth({
            xApiKey: true,
            jwtAccessToken: true,
        }),
        DocGuard({ role: true, policy: true }),
        DocRequest({
            dto: BatchIdsRequestDto,
            params: [...WorkspaceDocParamsId],
            bodyType: ENUM_DOC_REQUEST_BODY_TYPE.JSON,
        }),
        DocResponse<BatchResultResponseDto>('tool.batchDelete.success', {
            dto: BatchResultResponseDto,
            httpStatus: HttpStatus.OK,
        })
    );
}
