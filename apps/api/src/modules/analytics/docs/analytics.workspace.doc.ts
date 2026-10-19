import {
    Doc,
    DocAuth,
    DocRequest,
    DocResponse,
} from '@app/common/doc/decorators/doc.decorator';
import { WorkspaceDocParamsId } from '@app/modules/workspace/constants/workspace.doc.constant';
import { applyDecorators } from '@nestjs/common';
import { AnalyticsBotResponseDto } from '../dtos/response/analytics.bot.response.dto';
import { AnalyticsConversionResponseDto } from '../dtos/response/analytics.conversion.response.dto';
import { AnalyticsCustomersResponseDto } from '../dtos/response/analytics.customers.response.dto';
import { AnalyticsMarketingResponseDto } from '../dtos/response/analytics.marketing.response.dto';

function AnalyticsDoc<T>(
    summary: string,
    messagePath: string,
    dto: new () => T
): MethodDecorator {
    return applyDecorators(
        Doc({ summary }),
        DocRequest({ params: [...WorkspaceDocParamsId] }),
        DocAuth({ xApiKey: true, jwtAccessToken: true }),
        DocResponse<T>(messagePath, { dto })
    );
}

export const AnalyticsWorkspaceConversionDoc = (): MethodDecorator =>
    AnalyticsDoc(
        'Dashboard conversion: new customers, funnel per channel, orders',
        'analytics.workspace.conversion',
        AnalyticsConversionResponseDto
    );

export const AnalyticsWorkspaceMarketingDoc = (): MethodDecorator =>
    AnalyticsDoc(
        'Dashboard sentiment: positive, negative and complaint tags, unhappy customers',
        'analytics.workspace.marketing',
        AnalyticsMarketingResponseDto
    );

export const AnalyticsWorkspaceBotDoc = (): MethodDecorator =>
    AnalyticsDoc(
        'Dashboard bot performance: handoffs, reasons, per chatbot',
        'analytics.workspace.bot',
        AnalyticsBotResponseDto
    );

export const AnalyticsWorkspaceCustomersDoc = (): MethodDecorator =>
    AnalyticsDoc(
        'Dashboard customers: by tag, new and returning, by channel',
        'analytics.workspace.customers',
        AnalyticsCustomersResponseDto
    );
