import { CustomerGetResponseDto } from '@app/modules/customer/dtos/response/customer.get.response.dto';
import { CustomerMarketingService } from '@app/modules/customer/services/customer-marketing.service';
import { CustomerService } from '@app/modules/customer/services/customer.service';
import { ApiKeyProtected } from '@app/modules/api-key/decorators/api-key.decorator';
import { AuthJwtAccessProtected } from '@app/modules/auth/decorators/auth.jwt.decorator';
import { FeatureFlagProtected } from '@app/modules/feature-flag/decorators/feature-flag.decorator';
import { ENUM_FEATURE_FLAG } from '@app/modules/feature-flag/enums/feature-flag.enum';
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
import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { PaginationQuery } from 'src/common/pagination/decorators/pagination.decorator';
import { PaginationListDto } from 'src/common/pagination/dtos/pagination.list.dto';
import { PaginationService } from 'src/common/pagination/services/pagination.service';
import {
    Response,
    ResponsePaging,
} from 'src/common/response/decorators/response.decorator';
import {
    IResponse,
    IResponsePaging,
} from 'src/common/response/interfaces/response.interface';
import {
    MarketingAudienceWorkspaceCustomersDoc,
    MarketingAudienceWorkspacePreviewDoc,
} from '../docs/marketing-audience.workspace.doc';
import { MarketingAudienceRequestDto } from '../dtos/request/marketing-audience.request.dto';
import { MarketingAudiencePreviewResponseDto } from '../dtos/response/marketing-audience-preview.response.dto';
import { MarketingAudienceService } from '../services/marketing-audience.service';

@ApiTags('modules.workspace.marketingAudience')
@FeatureFlagProtected(ENUM_FEATURE_FLAG.MARKETING)
@Controller({ version: '1', path: '/:workspace/marketing/audiences' })
export class MarketingAudienceWorkspaceController {
    constructor(
        private readonly audienceService: MarketingAudienceService,
        private readonly customerService: CustomerService,
        private readonly marketingService: CustomerMarketingService,
        private readonly paginationService: PaginationService
    ) {}

    @MarketingAudienceWorkspacePreviewDoc()
    @Response('marketingAudience.workspace.preview')
    @WorkspacePolicyAbilityProtected({
        subject: ENUM_POLICY_SUBJECT.CUSTOMER,
        action: [ENUM_POLICY_ACTION.READ],
    })
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @HttpCode(HttpStatus.OK)
    @Post('/preview')
    async preview(
        @WorkspacePayload() workspace: WorkspaceEntity,
        @Body() body: MarketingAudienceRequestDto
    ): Promise<IResponse<MarketingAudiencePreviewResponseDto>> {
        return {
            data: await this.audienceService.preview(workspace.id, body),
        };
    }

    @MarketingAudienceWorkspaceCustomersDoc()
    @ResponsePaging('marketingAudience.workspace.customers')
    @WorkspacePolicyAbilityProtected({
        subject: ENUM_POLICY_SUBJECT.CUSTOMER,
        action: [ENUM_POLICY_ACTION.READ],
    })
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @HttpCode(HttpStatus.OK)
    @Post('/customers')
    async customers(
        @WorkspacePayload() workspace: WorkspaceEntity,
        @PaginationQuery() { _limit, _offset }: PaginationListDto,
        @Body() body: MarketingAudienceRequestDto
    ): Promise<IResponsePaging<CustomerGetResponseDto>> {
        const { ids, total } = await this.audienceService.reached(
            workspace.id,
            body,
            _limit,
            _offset
        );
        const [found, summaries, marketing] = await Promise.all([
            this.customerService.findByWorkspace(workspace.id, {
                id: { $in: ids },
            }),
            this.customerService.summarizeConversations(ids, workspace.id),
            this.marketingService.summarize(ids),
        ]);
        // Keep the audience's order: latest message first.
        const byId = new Map(found.map(c => [c.id, c]));
        const customers = ids.flatMap(id => byId.get(id) ?? []);

        return {
            _pagination: {
                total,
                totalPage: this.paginationService.totalPage(total, _limit),
            },
            data: this.customerService.mapList(customers, summaries, marketing),
        };
    }
}
