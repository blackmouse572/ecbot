import {
    Doc,
    DocAuth,
    DocRequest,
    DocResponse,
} from '@app/common/doc/decorators/doc.decorator';
import { ENUM_DOC_REQUEST_BODY_TYPE } from '@app/common/doc/enums/doc.enum';
import { WorkspaceDocParamsId } from '@app/modules/workspace/constants/workspace.doc.constant';
import { applyDecorators } from '@nestjs/common';
import { CustomerMarketingBackfillTaskDto } from '../dtos/customer-marketing-backfill.task.dto';
import { MarketingBackfillGetResponseDto } from '../dtos/response/marketing-backfill.get.response.dto';

export function CustomerMarketingBackfillWorkspaceGetDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary:
                'Get the progress of reading the last 90 days of conversations for marketing labels',
        }),
        DocRequest({ params: WorkspaceDocParamsId }),
        DocAuth({ xApiKey: true, jwtAccessToken: true }),
        DocResponse<MarketingBackfillGetResponseDto>(
            'customerMarketing.backfill.get',
            { dto: MarketingBackfillGetResponseDto }
        )
    );
}

export function CustomerMarketingBackfillWorkspaceStartDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary:
                'Read the last 90 days of conversations once to fill the marketing labels',
            description:
                'Spends at most 30% of the tokens left. Stopped at that cap, calling it again resumes where it stopped; a running or finished run is returned as it is.',
        }),
        DocRequest({ params: WorkspaceDocParamsId }),
        DocAuth({ xApiKey: true, jwtAccessToken: true }),
        DocResponse<MarketingBackfillGetResponseDto>(
            'customerMarketing.backfill.start',
            { dto: MarketingBackfillGetResponseDto }
        )
    );
}

export function CustomerMarketingBackfillTaskHandleDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary:
                'Handle one batch of the marketing backfill (Cloud Tasks callback)',
            description:
                'Internal back-channel: Cloud Tasks POSTs here for each batch of the 90-day marketing backfill. Not called by any client app.',
        }),
        DocRequest({
            bodyType: ENUM_DOC_REQUEST_BODY_TYPE.JSON,
            dto: CustomerMarketingBackfillTaskDto,
        }),
        DocAuth({ xApiKey: true }),
        DocResponse('customerMarketing.backfill.processed')
    );
}
