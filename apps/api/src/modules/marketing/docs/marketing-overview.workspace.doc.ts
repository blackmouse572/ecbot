import {
    Doc,
    DocAuth,
    DocRequest,
    DocResponse,
} from '@app/common/doc/decorators/doc.decorator';
import { WorkspaceDocParamsId } from '@app/modules/workspace/constants/workspace.doc.constant';
import { applyDecorators } from '@nestjs/common';
import { MarketingOverviewResponseDto } from '../dtos/response/marketing-overview.response.dto';

export function MarketingOverviewWorkspaceGetDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary:
                'Tổng quan: customers per stage against last week, funnel per channel, moves, Việc nên làm counts and list health',
        }),
        DocRequest({ params: [...WorkspaceDocParamsId] }),
        DocAuth({ xApiKey: true, jwtAccessToken: true }),
        DocResponse<MarketingOverviewResponseDto>(
            'marketingOverview.workspace.get',
            { dto: MarketingOverviewResponseDto }
        )
    );
}
