import { CustomerGetResponseDto } from '@app/modules/customer/dtos/response/customer.get.response.dto';
import { CustomerMarketingService } from '@app/modules/customer/services/customer-marketing.service';
import { CustomerService } from '@app/modules/customer/services/customer.service';
import { ENUM_ACTIVITY_ACTION } from '@app/modules/activity/enums/activity.enum';
import { ActivityService } from '@app/modules/activity/services/activity.service';
import { ApiKeyProtected } from '@app/modules/api-key/decorators/api-key.decorator';
import {
    AuthJwtAccessProtected,
    AuthJwtPayload,
} from '@app/modules/auth/decorators/auth.jwt.decorator';
import { FeatureFlagProtected } from '@app/modules/feature-flag/decorators/feature-flag.decorator';
import { ENUM_FEATURE_FLAG } from '@app/modules/feature-flag/enums/feature-flag.enum';
import {
    ENUM_POLICY_ACTION,
    ENUM_POLICY_SUBJECT,
} from '@app/modules/policy/enums/policy.enum';
import { UserProtected } from '@app/modules/user/decorators/user.decorator';
import { UserParsePipe } from '@app/modules/user/pipes/user.parse.pipe';
import { UserEntity } from '@app/modules/user/repository/entities/user.entity';
import {
    WorkspacePayload,
    WorkspacePolicyAbilityProtected,
} from '@app/modules/workspace/decorators/workspace.decorator';
import { WorkspaceEntity } from '@app/modules/workspace/repository/entities/workspace.entity';
import {
    Body,
    Controller,
    Delete,
    Get,
    HttpCode,
    HttpStatus,
    Param,
    Patch,
    Post,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { PaginationQuery } from 'src/common/pagination/decorators/pagination.decorator';
import { PaginationListDto } from 'src/common/pagination/dtos/pagination.list.dto';
import { ENUM_PAGINATION_ORDER_DIRECTION_TYPE } from 'src/common/pagination/enums/pagination.enum';
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
    MARKETING_AUDIENCE_AVAILABLE_ORDER_BY,
    MARKETING_AUDIENCE_AVAILABLE_SEARCH,
} from '../constants/marketing-audience.constant';
import { MARKETING_AUDIENCE_PARAM } from '../constants/marketing-audience.doc.constant';
import {
    MarketingAudienceWorkspaceCustomersDoc,
    MarketingAudienceWorkspacePreviewDoc,
} from '../docs/marketing-audience.workspace.doc';
import {
    MarketingSavedAudienceCreateDoc,
    MarketingSavedAudienceDeleteDoc,
    MarketingSavedAudienceListDoc,
    MarketingSavedAudienceUpdateDoc,
} from '../docs/marketing-saved-audience.doc';
import { MarketingAudienceCustomersRequestDto } from '../dtos/request/marketing-audience-customers.request.dto';
import { MarketingAudiencePreviewRequestDto } from '../dtos/request/marketing-audience-preview.request.dto';
import { MarketingSavedAudienceCreateRequestDto } from '../dtos/request/marketing-saved-audience.create.request.dto';
import { MarketingSavedAudienceUpdateRequestDto } from '../dtos/request/marketing-saved-audience.update.request.dto';
import { MarketingAudiencePreviewResponseDto } from '../dtos/response/marketing-audience-preview.response.dto';
import { MarketingSavedAudienceGetResponseDto } from '../dtos/response/marketing-saved-audience.get.response.dto';
import { MarketingSavedAudienceEntity } from '../repository/entities/marketing-saved-audience.entity';
import { MarketingAudienceService } from '../services/marketing-audience.service';
import { MarketingSavedAudienceService } from '../services/marketing-saved-audience.service';

@ApiTags('modules.workspace.marketingAudience')
@FeatureFlagProtected(ENUM_FEATURE_FLAG.MARKETING)
@Controller({ version: '1', path: '/:workspace/marketing/audiences' })
export class MarketingAudienceWorkspaceController {
    constructor(
        private readonly audienceService: MarketingAudienceService,
        private readonly customerService: CustomerService,
        private readonly marketingService: CustomerMarketingService,
        private readonly paginationService: PaginationService,
        private readonly savedService: MarketingSavedAudienceService,
        private readonly activityService: ActivityService
    ) {}

    @MarketingSavedAudienceListDoc('workspace')
    @ResponsePaging('marketingAudience.saved.list')
    @WorkspacePolicyAbilityProtected({
        subject: ENUM_POLICY_SUBJECT.MARKETING,
        action: [ENUM_POLICY_ACTION.READ],
    })
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Get('/')
    async list(
        @WorkspacePayload() workspace: WorkspaceEntity,
        @PaginationQuery({
            availableSearch: MARKETING_AUDIENCE_AVAILABLE_SEARCH,
            availableOrderBy: MARKETING_AUDIENCE_AVAILABLE_ORDER_BY,
            defaultOrderBy: 'createdAt',
            defaultOrderDirection: ENUM_PAGINATION_ORDER_DIRECTION_TYPE.DESC,
        })
        { _search, _limit, _offset, _order }: PaginationListDto
    ): Promise<IResponsePaging<MarketingSavedAudienceGetResponseDto>> {
        const find: Record<string, any> = { ..._search };
        const [audiences, total] = await Promise.all([
            this.savedService.findAll(workspace.id, find, {
                paging: { limit: _limit, offset: _offset },
                order: _order,
            }),
            this.savedService.getTotal(workspace.id, find),
        ]);
        return {
            _pagination: {
                total,
                totalPage: this.paginationService.totalPage(total, _limit),
            },
            data: this.savedService.mapList(audiences),
        };
    }

    @MarketingSavedAudienceCreateDoc('workspace')
    @Response('marketingAudience.saved.create')
    @WorkspacePolicyAbilityProtected({
        subject: ENUM_POLICY_SUBJECT.MARKETING,
        action: [ENUM_POLICY_ACTION.CREATE],
    })
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Post('/')
    async create(
        @WorkspacePayload() workspace: WorkspaceEntity,
        @AuthJwtPayload('user', UserParsePipe) user: UserEntity,
        @Body() body: MarketingSavedAudienceCreateRequestDto
    ): Promise<IResponse<MarketingSavedAudienceGetResponseDto>> {
        const audience = await this.savedService.create(workspace.id, body);
        await this.log(user, workspace, ENUM_ACTIVITY_ACTION.CREATE, audience);
        return { data: this.savedService.mapGet(audience) };
    }

    @MarketingSavedAudienceUpdateDoc('workspace')
    @Response('marketingAudience.saved.update')
    @WorkspacePolicyAbilityProtected({
        subject: ENUM_POLICY_SUBJECT.MARKETING,
        action: [ENUM_POLICY_ACTION.UPDATE],
    })
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Patch(`/:${MARKETING_AUDIENCE_PARAM}`)
    async update(
        @WorkspacePayload() workspace: WorkspaceEntity,
        @AuthJwtPayload('user', UserParsePipe) user: UserEntity,
        @Param(MARKETING_AUDIENCE_PARAM) id: string,
        @Body() body: MarketingSavedAudienceUpdateRequestDto
    ): Promise<IResponse<MarketingSavedAudienceGetResponseDto>> {
        const audience = await this.savedService.update(id, workspace.id, body);
        await this.log(user, workspace, ENUM_ACTIVITY_ACTION.UPDATE, audience);
        return { data: this.savedService.mapGet(audience) };
    }

    @MarketingSavedAudienceDeleteDoc('workspace')
    @Response('marketingAudience.saved.delete')
    @WorkspacePolicyAbilityProtected({
        subject: ENUM_POLICY_SUBJECT.MARKETING,
        action: [ENUM_POLICY_ACTION.DELETE],
    })
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @HttpCode(HttpStatus.NO_CONTENT)
    @Delete(`/:${MARKETING_AUDIENCE_PARAM}`)
    async delete(
        @WorkspacePayload() workspace: WorkspaceEntity,
        @AuthJwtPayload('user', UserParsePipe) user: UserEntity,
        @Param(MARKETING_AUDIENCE_PARAM) id: string
    ): Promise<void> {
        const audience = await this.savedService.delete(id, workspace.id);
        await this.log(user, workspace, ENUM_ACTIVITY_ACTION.DELETE, audience);
    }

    @MarketingAudienceWorkspacePreviewDoc()
    @Response('marketingAudience.workspace.preview')
    @WorkspacePolicyAbilityProtected({
        subject: ENUM_POLICY_SUBJECT.MARKETING,
        action: [ENUM_POLICY_ACTION.READ],
    })
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @HttpCode(HttpStatus.OK)
    @Post('/preview')
    async preview(
        @WorkspacePayload() workspace: WorkspaceEntity,
        @Body() body: MarketingAudiencePreviewRequestDto
    ): Promise<IResponse<MarketingAudiencePreviewResponseDto>> {
        return {
            data: await this.audienceService.preview(workspace.id, body),
        };
    }

    @MarketingAudienceWorkspaceCustomersDoc()
    @ResponsePaging('marketingAudience.workspace.customers')
    @WorkspacePolicyAbilityProtected({
        subject: ENUM_POLICY_SUBJECT.MARKETING,
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
        @Body() body: MarketingAudienceCustomersRequestDto
    ): Promise<IResponsePaging<CustomerGetResponseDto>> {
        const { platform, search, ...audience } = body;
        const { ids, total } = await this.audienceService.reached(
            workspace.id,
            audience,
            _limit,
            _offset,
            { filter: { platform, search } }
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

    private log(
        user: UserEntity,
        workspace: WorkspaceEntity,
        action: ENUM_ACTIVITY_ACTION,
        audience: MarketingSavedAudienceEntity
    ) {
        return this.activityService.createByUserWithWorkspace(user, workspace, {
            action,
            subject: ENUM_POLICY_SUBJECT.CUSTOMER,
            metadata: { id: audience.id, name: audience.name },
        });
    }
}
