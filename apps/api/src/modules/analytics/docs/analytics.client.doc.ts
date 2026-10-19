import {
    Doc,
    DocAuth,
    DocResponse,
} from '@app/common/doc/decorators/doc.decorator';
import { applyDecorators } from '@nestjs/common';
import { AnalyticsBotResponseDto } from '../dtos/response/analytics.bot.response.dto';
import { AnalyticsConversionResponseDto } from '../dtos/response/analytics.conversion.response.dto';
import { AnalyticsCustomersResponseDto } from '../dtos/response/analytics.customers.response.dto';
import { AnalyticsMarketingResponseDto } from '../dtos/response/analytics.marketing.response.dto';

function AnalyticsClientDoc<T>(
    summary: string,
    messagePath: string,
    dto: new () => T
): MethodDecorator {
    return applyDecorators(
        Doc({ summary }),
        DocAuth({ xApiKey: true }),
        DocResponse<T>(messagePath, { dto })
    );
}

export const AnalyticsClientConversionDoc = (): MethodDecorator =>
    AnalyticsClientDoc(
        'conversion of the credential workspace: new customers, funnel per channel, orders',
        'analytics.workspace.conversion',
        AnalyticsConversionResponseDto
    );

export const AnalyticsClientMarketingDoc = (): MethodDecorator =>
    AnalyticsClientDoc(
        'sentiment of the credential workspace: positive, negative and complaint tags, unhappy customers',
        'analytics.workspace.marketing',
        AnalyticsMarketingResponseDto
    );

export const AnalyticsClientBotDoc = (): MethodDecorator =>
    AnalyticsClientDoc(
        'bot performance of the credential workspace: handoffs, reasons, per chatbot',
        'analytics.workspace.bot',
        AnalyticsBotResponseDto
    );

export const AnalyticsClientCustomersDoc = (): MethodDecorator =>
    AnalyticsClientDoc(
        'customers of the credential workspace: by tag, new and returning, by channel',
        'analytics.workspace.customers',
        AnalyticsCustomersResponseDto
    );
