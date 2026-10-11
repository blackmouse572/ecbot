import { applyDecorators } from '@nestjs/common';
import { DatabaseIdResponseDto } from 'src/common/database/dtos/response/database.id.response.dto';
import {
    Doc,
    DocAuth,
    DocGuard,
    DocRequest,
    DocResponse,
    DocResponsePaging,
} from 'src/common/doc/decorators/doc.decorator';
import {
    ToolAdminDocQueryList,
    ToolDocParamsId,
} from 'src/modules/tool/constants/tool.doc.constant';
import {
    ToolAdminListResponseDto,
    ToolAdminResponseDto,
} from 'src/modules/tool/dtos/response/tool.admin.response.dto';

export function ToolAdminListDoc(): MethodDecorator {
    return applyDecorators(
        Doc({ summary: 'list tools across every workspace' }),
        DocRequest({ queries: ToolAdminDocQueryList }),
        DocAuth({ xApiKey: true, jwtAccessToken: true }),
        DocGuard({ role: true, policy: true }),
        DocResponsePaging<ToolAdminListResponseDto>('tool.list.success', {
            dto: ToolAdminListResponseDto,
        })
    );
}

export function ToolAdminGetDoc(): MethodDecorator {
    return applyDecorators(
        Doc({ summary: 'get one tool with its invocation stats' }),
        DocRequest({ params: ToolDocParamsId }),
        DocAuth({ xApiKey: true, jwtAccessToken: true }),
        DocGuard({ role: true, policy: true }),
        DocResponse<ToolAdminResponseDto>('tool.get.success', {
            dto: ToolAdminResponseDto,
        })
    );
}

export function ToolAdminActivateDoc(): MethodDecorator {
    return applyDecorators(
        Doc({ summary: 'turn a tool an admin inactivated back on' }),
        DocRequest({ params: ToolDocParamsId }),
        DocAuth({ xApiKey: true, jwtAccessToken: true }),
        DocGuard({ role: true, policy: true }),
        DocResponse<DatabaseIdResponseDto>('tool.activate.success', {
            dto: DatabaseIdResponseDto,
        })
    );
}

export function ToolAdminInactivateDoc(): MethodDecorator {
    return applyDecorators(
        Doc({ summary: 'turn a tool off for every chatbot that uses it' }),
        DocRequest({ params: ToolDocParamsId }),
        DocAuth({ xApiKey: true, jwtAccessToken: true }),
        DocGuard({ role: true, policy: true }),
        DocResponse<DatabaseIdResponseDto>('tool.inactivate.success', {
            dto: DatabaseIdResponseDto,
        })
    );
}

export function ToolAdminDeleteDoc(): MethodDecorator {
    return applyDecorators(
        Doc({ summary: 'delete a tool in any workspace' }),
        DocRequest({ params: ToolDocParamsId }),
        DocAuth({ xApiKey: true, jwtAccessToken: true }),
        DocGuard({ role: true, policy: true }),
        DocResponse<DatabaseIdResponseDto>('tool.delete.success', {
            dto: DatabaseIdResponseDto,
        })
    );
}
