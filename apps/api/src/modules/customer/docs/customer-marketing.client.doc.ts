import {
    Doc,
    DocAuth,
    DocRequest,
    DocResponse,
    DocResponsePaging,
} from '@app/common/doc/decorators/doc.decorator';
import { ENUM_DOC_REQUEST_BODY_TYPE } from '@app/common/doc/enums/doc.enum';
import { applyDecorators } from '@nestjs/common';
import { CustomerDocParamsId } from '../constants/customer.doc.constant';
import { CustomerMarketingStateUpdateRequestDto } from '../dtos/request/customer-marketing-state.update.request.dto';
import { CustomerMarketingStateGetResponseDto } from '../dtos/response/customer-marketing-state.get.response.dto';
import { MarketingEventGetResponseDto } from '../dtos/response/marketing-event.get.response.dto';

export function CustomerMarketingClientGetDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary:
                "get a customer's marketing labels, the reason behind each, and the free-message windows",
        }),
        DocRequest({ params: CustomerDocParamsId }),
        DocAuth({ xApiKey: true }),
        DocResponse<CustomerMarketingStateGetResponseDto>(
            'customerMarketing.workspace.get',
            { dto: CustomerMarketingStateGetResponseDto }
        )
    );
}

export function CustomerMarketingClientUpdateDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary:
                "change a customer's marketing labels; the reason is kept in the history",
        }),
        DocRequest({
            params: CustomerDocParamsId,
            dto: CustomerMarketingStateUpdateRequestDto,
            bodyType: ENUM_DOC_REQUEST_BODY_TYPE.JSON,
        }),
        DocAuth({ xApiKey: true }),
        DocResponse<CustomerMarketingStateGetResponseDto>(
            'customerMarketing.workspace.update',
            { dto: CustomerMarketingStateGetResponseDto }
        )
    );
}

export function CustomerMarketingClientListEventsDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary:
                "list the history behind a customer's marketing labels, newest first",
        }),
        DocRequest({ params: CustomerDocParamsId }),
        DocAuth({ xApiKey: true }),
        DocResponsePaging<MarketingEventGetResponseDto>(
            'customerMarketing.workspace.listEvents',
            { dto: MarketingEventGetResponseDto }
        )
    );
}
