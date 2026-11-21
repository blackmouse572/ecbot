import {
    Doc,
    DocAuth,
    DocRequest,
    DocResponse,
    DocResponsePaging,
} from '@app/common/doc/decorators/doc.decorator';
import { ENUM_DOC_REQUEST_BODY_TYPE } from '@app/common/doc/enums/doc.enum';
import { CustomerGetResponseDto } from '@app/modules/customer/dtos/response/customer.get.response.dto';
import { WorkspaceDocParamsId } from '@app/modules/workspace/constants/workspace.doc.constant';
import { applyDecorators } from '@nestjs/common';
import { MarketingAudienceRequestDto } from '../dtos/request/marketing-audience.request.dto';
import { MarketingAudiencePreviewResponseDto } from '../dtos/response/marketing-audience-preview.response.dto';

export function MarketingAudienceWorkspacePreviewDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary:
                'Count the customers a preset or conditions reach, those left out by reason, and reached customers per channel',
        }),
        DocRequest({
            params: [...WorkspaceDocParamsId],
            dto: MarketingAudienceRequestDto,
            bodyType: ENUM_DOC_REQUEST_BODY_TYPE.JSON,
        }),
        DocAuth({ xApiKey: true, jwtAccessToken: true }),
        DocResponse<MarketingAudiencePreviewResponseDto>(
            'marketingAudience.workspace.preview',
            { dto: MarketingAudiencePreviewResponseDto }
        )
    );
}

export function MarketingAudienceWorkspaceCustomersDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary:
                'List the customers a preset or conditions reach, latest message first',
        }),
        DocRequest({
            params: [...WorkspaceDocParamsId],
            dto: MarketingAudienceRequestDto,
            bodyType: ENUM_DOC_REQUEST_BODY_TYPE.JSON,
        }),
        DocAuth({ xApiKey: true, jwtAccessToken: true }),
        DocResponsePaging<CustomerGetResponseDto>(
            'marketingAudience.workspace.customers',
            { dto: CustomerGetResponseDto }
        )
    );
}
