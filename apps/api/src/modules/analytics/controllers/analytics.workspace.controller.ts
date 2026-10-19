import { IResponse } from '@app/common/response/interfaces/response.interface';
import { ApiKeyProtected } from '@app/modules/api-key/decorators/api-key.decorator';
import { AuthJwtAccessProtected } from '@app/modules/auth/decorators/auth.jwt.decorator';
import {
    ENUM_POLICY_ACTION,
    ENUM_POLICY_SUBJECT,
} from '@app/modules/policy/enums/policy.enum';
import { UserProtected } from '@app/modules/user/decorators/user.decorator';
import {
    WorkspacePayload,
    WorkspacePolicyAbilityProtected,
} from '@app/modules/workspace/decorators/workspace.decorator';
import { WorkspaceEntity } from '@app/modules/workspace/repository/entities/workspace.entity';
import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Response } from 'src/common/response/decorators/response.decorator';
import {
    AnalyticsWorkspaceBotDoc,
    AnalyticsWorkspaceConversionDoc,
    AnalyticsWorkspaceCustomersDoc,
    AnalyticsWorkspaceMarketingDoc,
} from '../docs/analytics.workspace.doc';
import { AnalyticsRangeRequestDto } from '../dtos/request/analytics.range.request.dto';
import { AnalyticsBotResponseDto } from '../dtos/response/analytics.bot.response.dto';
import { AnalyticsConversionResponseDto } from '../dtos/response/analytics.conversion.response.dto';
import { AnalyticsCustomersResponseDto } from '../dtos/response/analytics.customers.response.dto';
import { AnalyticsMarketingResponseDto } from '../dtos/response/analytics.marketing.response.dto';
import { AnalyticsService } from '../services/analytics.service';

const READ = [ENUM_POLICY_ACTION.READ];

/**
 * One endpoint per dashboard tab, each behind the abilities of the pages its
 * numbers come from. Conversations are read through CHATBOT, as on the
 * conversations page: CONVERSATION is not a subject a role can be granted.
 */
@ApiTags('modules.workspace.analytics')
@Controller({ version: '1', path: '/:workspace/analytics' })
export class AnalyticsWorkspaceController {
    constructor(private readonly analyticsService: AnalyticsService) {}

    @AnalyticsWorkspaceConversionDoc()
    @Response('analytics.workspace.conversion')
    @WorkspacePolicyAbilityProtected({
        subject: ENUM_POLICY_SUBJECT.CUSTOMER,
        action: READ,
    })
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Get('/conversion')
    async conversion(
        @WorkspacePayload() workspace: WorkspaceEntity,
        @Query() { range, timezone }: AnalyticsRangeRequestDto
    ): Promise<IResponse<AnalyticsConversionResponseDto>> {
        return {
            data: await this.analyticsService.getConversion(
                workspace.id,
                range,
                timezone
            ),
        };
    }

    @AnalyticsWorkspaceMarketingDoc()
    @Response('analytics.workspace.marketing')
    @WorkspacePolicyAbilityProtected(
        { subject: ENUM_POLICY_SUBJECT.CUSTOMER, action: READ },
        { subject: ENUM_POLICY_SUBJECT.CHATBOT, action: READ }
    )
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Get('/marketing')
    async marketing(
        @WorkspacePayload() workspace: WorkspaceEntity,
        @Query() { range, timezone }: AnalyticsRangeRequestDto
    ): Promise<IResponse<AnalyticsMarketingResponseDto>> {
        return {
            data: await this.analyticsService.getMarketing(
                workspace.id,
                range,
                timezone
            ),
        };
    }

    @AnalyticsWorkspaceBotDoc()
    @Response('analytics.workspace.bot')
    @WorkspacePolicyAbilityProtected({
        subject: ENUM_POLICY_SUBJECT.CHATBOT,
        action: READ,
    })
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Get('/bot')
    async bot(
        @WorkspacePayload() workspace: WorkspaceEntity,
        @Query() { range, timezone }: AnalyticsRangeRequestDto
    ): Promise<IResponse<AnalyticsBotResponseDto>> {
        return {
            data: await this.analyticsService.getBot(
                workspace.id,
                range,
                timezone
            ),
        };
    }

    @AnalyticsWorkspaceCustomersDoc()
    @Response('analytics.workspace.customers')
    @WorkspacePolicyAbilityProtected({
        subject: ENUM_POLICY_SUBJECT.CUSTOMER,
        action: READ,
    })
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Get('/customers')
    async customers(
        @WorkspacePayload() workspace: WorkspaceEntity,
        @Query() { range, timezone }: AnalyticsRangeRequestDto
    ): Promise<IResponse<AnalyticsCustomersResponseDto>> {
        return {
            data: await this.analyticsService.getCustomers(
                workspace.id,
                range,
                timezone
            ),
        };
    }
}
