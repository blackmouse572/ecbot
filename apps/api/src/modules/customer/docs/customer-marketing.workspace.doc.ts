import {
    Doc,
    DocAuth,
    DocRequest,
    DocResponse,
    DocResponsePaging,
} from '@app/common/doc/decorators/doc.decorator';
import { ENUM_DOC_REQUEST_BODY_TYPE } from '@app/common/doc/enums/doc.enum';
import { WorkspaceDocParamsId } from '@app/modules/workspace/constants/workspace.doc.constant';
import { applyDecorators } from '@nestjs/common';
import { CustomerDocParamsId } from '../constants/customer.doc.constant';
import { CustomerMarketingStateUpdateRequestDto } from '../dtos/request/customer-marketing-state.update.request.dto';
import { CustomerMarketingStateGetResponseDto } from '../dtos/response/customer-marketing-state.get.response.dto';
import { MarketingEventGetResponseDto } from '../dtos/response/marketing-event.get.response.dto';

export function CustomerMarketingWorkspaceGetDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary:
                "Get a customer's marketing labels: journey stage, messaging permission, Khó chịu and Ngủ đông",
        }),
        DocRequest({
            params: [...WorkspaceDocParamsId, ...CustomerDocParamsId],
        }),
        DocAuth({ xApiKey: true, jwtAccessToken: true }),
        DocResponse<CustomerMarketingStateGetResponseDto>(
            'customerMarketing.workspace.get',
            { dto: CustomerMarketingStateGetResponseDto }
        )
    );
}

export function CustomerMarketingWorkspaceUpdateDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary:
                "Change a customer's marketing labels; the reason is kept in the history",
        }),
        DocRequest({
            params: [...WorkspaceDocParamsId, ...CustomerDocParamsId],
            dto: CustomerMarketingStateUpdateRequestDto,
            bodyType: ENUM_DOC_REQUEST_BODY_TYPE.JSON,
        }),
        DocAuth({ xApiKey: true, jwtAccessToken: true }),
        DocResponse<CustomerMarketingStateGetResponseDto>(
            'customerMarketing.workspace.update',
            { dto: CustomerMarketingStateGetResponseDto }
        )
    );
}

export function CustomerMarketingWorkspaceListEventsDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary:
                "List the history behind a customer's marketing labels, newest first",
        }),
        DocRequest({
            params: [...WorkspaceDocParamsId, ...CustomerDocParamsId],
        }),
        DocAuth({ xApiKey: true, jwtAccessToken: true }),
        DocResponsePaging<MarketingEventGetResponseDto>(
            'customerMarketing.workspace.listEvents',
            { dto: MarketingEventGetResponseDto }
        )
    );
}
