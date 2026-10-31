import { applyDecorators } from '@nestjs/common';
import { ENUM_DOC_REQUEST_BODY_TYPE } from 'src/common/doc/enums/doc.enum';
import {
    Doc,
    DocAuth,
    DocGuard,
    DocRequest,
    DocResponse,
    DocResponsePaging,
} from 'src/common/doc/decorators/doc.decorator';
import { UpdateToolkitRequestDto } from 'src/modules/tool/dtos/request/update-toolkit.request.dto';
import {
    ToolkitAdminDocParamsSlug,
    ToolkitAdminDocQuerySearch,
} from 'src/modules/tool/constants/tool.doc.constant';
import {
    ToolkitAdminComposioStatusResponseDto,
    ToolkitAdminEcchoDetailResponseDto,
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

export function ToolkitAdminEcchoGetDoc(): MethodDecorator {
    return applyDecorators(
        Doc({ summary: "get one of Ecbot's own toolkits with its installs" }),
        DocRequest({ params: ToolkitAdminDocParamsSlug }),
        DocAuth({ xApiKey: true, jwtAccessToken: true }),
        DocGuard({ role: true, policy: true }),
        DocResponse<ToolkitAdminEcchoDetailResponseDto>(
            'tool.toolkit.ecchoGet',
            {
                dto: ToolkitAdminEcchoDetailResponseDto,
            }
        )
    );
}

export function ToolkitAdminEcchoUpdateDoc(): MethodDecorator {
    return applyDecorators(
        Doc({ summary: "edit how one of Ecbot's own toolkits is shown" }),
        DocRequest({
            params: ToolkitAdminDocParamsSlug,
            bodyType: ENUM_DOC_REQUEST_BODY_TYPE.JSON,
            dto: UpdateToolkitRequestDto,
        }),
        DocAuth({ xApiKey: true, jwtAccessToken: true }),
        DocGuard({ role: true, policy: true }),
        DocResponse<ToolkitAdminEcchoDetailResponseDto>(
            'tool.toolkit.ecchoUpdate',
            { dto: ToolkitAdminEcchoDetailResponseDto }
        )
    );
}
