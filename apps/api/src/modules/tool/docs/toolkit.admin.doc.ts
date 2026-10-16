import { applyDecorators } from '@nestjs/common';
import {
    Doc,
    DocAuth,
    DocGuard,
    DocRequest,
    DocResponse,
    DocResponsePaging,
} from 'src/common/doc/decorators/doc.decorator';
import { ToolkitAdminDocQuerySearch } from 'src/modules/tool/constants/tool.doc.constant';
import {
    ToolkitAdminComposioStatusResponseDto,
    ToolkitAdminEcchoResponseDto,
    ToolkitAdminResponseDto,
} from 'src/modules/tool/dtos/response/toolkit.admin.response.dto';

export function ToolkitAdminEcchoListDoc(): MethodDecorator {
    return applyDecorators(
        Doc({ summary: "list Ecbot's own toolkits with install counts" }),
        DocAuth({ xApiKey: true, jwtAccessToken: true }),
        DocGuard({ role: true, policy: true }),
        DocResponsePaging<ToolkitAdminEcchoResponseDto>('tool.toolkit.eccho', {
            dto: ToolkitAdminEcchoResponseDto,
        })
    );
}

export function ToolkitAdminComposioListDoc(): MethodDecorator {
    return applyDecorators(
        Doc({ summary: 'page the Composio catalog with install counts' }),
        DocRequest({ queries: ToolkitAdminDocQuerySearch }),
        DocAuth({ xApiKey: true, jwtAccessToken: true }),
        DocGuard({ role: true, policy: true }),
        DocResponsePaging<ToolkitAdminResponseDto>('tool.toolkit.composio', {
            dto: ToolkitAdminResponseDto,
        })
    );
}

export function ToolkitAdminComposioStatusDoc(): MethodDecorator {
    return applyDecorators(
        Doc({ summary: 'whether Composio is configured and answering' }),
        DocAuth({ xApiKey: true, jwtAccessToken: true }),
        DocGuard({ role: true, policy: true }),
        DocResponse<ToolkitAdminComposioStatusResponseDto>(
            'tool.toolkit.composioStatus',
            { dto: ToolkitAdminComposioStatusResponseDto }
        )
    );
}
