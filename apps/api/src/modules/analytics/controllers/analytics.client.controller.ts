import { IResponse } from '@app/common/response/interfaces/response.interface';
import {
    ClientCredentialPayload,
    ClientCredentialProtected,
} from '@app/modules/client-credential/decorators/client-credential.decorator';
import { ClientCredentialEntity } from '@app/modules/client-credential/repository/entities/client-credential.entity';
import { ChannelRateLimitService } from '@app/modules/platform/services/channel-rate-limit.service';
import {
    ENUM_POLICY_ACTION,
    ENUM_POLICY_SUBJECT,
} from '@app/modules/policy/enums/policy.enum';
import { WorkspacePayload } from '@app/modules/workspace/decorators/workspace.decorator';
import { WorkspaceEntity } from '@app/modules/workspace/repository/entities/workspace.entity';
import {
    Controller,
    Get,
    HttpException,
    HttpStatus,
    Query,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Response } from 'src/common/response/decorators/response.decorator';
import {
    ANALYTICS_CLIENT_RATE_LIMIT,
    ANALYTICS_CLIENT_RATE_WINDOW_SECONDS,
} from '../constants/analytics.constant';
import {
    AnalyticsClientBotDoc,
    AnalyticsClientConversionDoc,
    AnalyticsClientCustomersDoc,
    AnalyticsClientMarketingDoc,
} from '../docs/analytics.client.doc';
import { AnalyticsRangeRequestDto } from '../dtos/request/analytics.range.request.dto';
import { AnalyticsBotResponseDto } from '../dtos/response/analytics.bot.response.dto';
import { AnalyticsConversionResponseDto } from '../dtos/response/analytics.conversion.response.dto';
import { AnalyticsCustomersResponseDto } from '../dtos/response/analytics.customers.response.dto';
import { AnalyticsMarketingResponseDto } from '../dtos/response/analytics.marketing.response.dto';
import { ENUM_ANALYTICS_STATUS_CODE_ERROR } from '../enums/analytics.status-code.enum';
import { AnalyticsService } from '../services/analytics.service';

const READ = [ENUM_POLICY_ACTION.READ];

/**
 * The dashboard tabs for a client credential, behind the abilities of their
 * workspace routes. All tabs share one budget per credential, counted in
 * Redis so it holds across instances.
 */
@ApiTags('modules.client.analytics')
@Controller({ version: '1', path: '/analytics' })
export class AnalyticsClientController {
    constructor(
        private readonly analyticsService: AnalyticsService,
        private readonly rateLimit: ChannelRateLimitService
    ) {}

    @AnalyticsClientConversionDoc()
    @Response('analytics.workspace.conversion')
    @ClientCredentialProtected({
        subject: ENUM_POLICY_SUBJECT.CUSTOMER,
        action: READ,
    })
    @Get('/conversion')
    async conversion(
        @ClientCredentialPayload() credential: ClientCredentialEntity,
        @WorkspacePayload() workspace: WorkspaceEntity,
        @Query() { range, timezone }: AnalyticsRangeRequestDto
    ): Promise<IResponse<AnalyticsConversionResponseDto>> {
        await this.claim(credential);
        return {
            data: await this.analyticsService.getConversion(
                workspace.id,
                range,
                timezone
            ),
        };
    }

    @AnalyticsClientMarketingDoc()
    @Response('analytics.workspace.marketing')
    @ClientCredentialProtected(
        { subject: ENUM_POLICY_SUBJECT.CUSTOMER, action: READ },
        { subject: ENUM_POLICY_SUBJECT.CHATBOT, action: READ }
    )
    @Get('/marketing')
    async marketing(
        @ClientCredentialPayload() credential: ClientCredentialEntity,
        @WorkspacePayload() workspace: WorkspaceEntity,
        @Query() { range, timezone }: AnalyticsRangeRequestDto
    ): Promise<IResponse<AnalyticsMarketingResponseDto>> {
        await this.claim(credential);
        return {
            data: await this.analyticsService.getMarketing(
                workspace.id,
                range,
                timezone
            ),
        };
    }

    @AnalyticsClientBotDoc()
    @Response('analytics.workspace.bot')
    @ClientCredentialProtected({
        subject: ENUM_POLICY_SUBJECT.CHATBOT,
        action: READ,
    })
    @Get('/bot')
    async bot(
        @ClientCredentialPayload() credential: ClientCredentialEntity,
        @WorkspacePayload() workspace: WorkspaceEntity,
        @Query() { range, timezone }: AnalyticsRangeRequestDto
    ): Promise<IResponse<AnalyticsBotResponseDto>> {
        await this.claim(credential);
        return {
            data: await this.analyticsService.getBot(
                workspace.id,
                range,
                timezone
            ),
        };
    }

    @AnalyticsClientCustomersDoc()
    @Response('analytics.workspace.customers')
    @ClientCredentialProtected({
        subject: ENUM_POLICY_SUBJECT.CUSTOMER,
        action: READ,
    })
    @Get('/customers')
    async customers(
        @ClientCredentialPayload() credential: ClientCredentialEntity,
        @WorkspacePayload() workspace: WorkspaceEntity,
        @Query() { range, timezone }: AnalyticsRangeRequestDto
    ): Promise<IResponse<AnalyticsCustomersResponseDto>> {
        await this.claim(credential);
        return {
            data: await this.analyticsService.getCustomers(
                workspace.id,
                range,
                timezone
            ),
        };
    }

    private async claim(credential: ClientCredentialEntity): Promise<void> {
        const within = await this.rateLimit.claim(
            `analytics:${credential.id}`,
            ANALYTICS_CLIENT_RATE_LIMIT,
            ANALYTICS_CLIENT_RATE_WINDOW_SECONDS
        );
        if (!within) {
            throw new HttpException(
                {
                    statusCode: ENUM_ANALYTICS_STATUS_CODE_ERROR.RATE_LIMITED,
                    message: 'analytics.error.rateLimited',
                },
                HttpStatus.TOO_MANY_REQUESTS
            );
        }
    }
}
