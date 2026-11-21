import { ENUM_ACTIVITY_ACTION } from '@app/modules/activity/enums/activity.enum';
import { ActivityService } from '@app/modules/activity/services/activity.service';
import {
    ClientCredentialPayload,
    ClientCredentialProtected,
} from '@app/modules/client-credential/decorators/client-credential.decorator';
import { ClientCredentialEntity } from '@app/modules/client-credential/repository/entities/client-credential.entity';
import { FeatureFlagProtected } from '@app/modules/feature-flag/decorators/feature-flag.decorator';
import { ENUM_FEATURE_FLAG } from '@app/modules/feature-flag/enums/feature-flag.enum';
import {
    ENUM_POLICY_ACTION,
    ENUM_POLICY_SUBJECT,
} from '@app/modules/policy/enums/policy.enum';
import { WorkspacePayload } from '@app/modules/workspace/decorators/workspace.decorator';
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
    MarketingSavedAudienceCreateDoc,
    MarketingSavedAudienceDeleteDoc,
    MarketingSavedAudienceListDoc,
    MarketingSavedAudienceUpdateDoc,
} from '../docs/marketing-saved-audience.doc';
import { MarketingSavedAudienceCreateRequestDto } from '../dtos/request/marketing-saved-audience.create.request.dto';
import { MarketingSavedAudienceUpdateRequestDto } from '../dtos/request/marketing-saved-audience.update.request.dto';
import { MarketingSavedAudienceGetResponseDto } from '../dtos/response/marketing-saved-audience.get.response.dto';
import { MarketingSavedAudienceEntity } from '../repository/entities/marketing-saved-audience.entity';
import { MarketingSavedAudienceService } from '../services/marketing-saved-audience.service';

// 3rd-party surface: the workspace comes from the credential, and writes are
// logged as the member who created it.
@ApiTags('modules.client.marketingAudience')
@FeatureFlagProtected(ENUM_FEATURE_FLAG.MARKETING)
@Controller('/marketing/audiences')
export class MarketingSavedAudienceClientController {
    constructor(
        private readonly savedService: MarketingSavedAudienceService,
        private readonly paginationService: PaginationService,
        private readonly activityService: ActivityService
    ) {}

    @MarketingSavedAudienceListDoc('client')
    @ResponsePaging('marketingAudience.saved.list')
    @ClientCredentialProtected({
        subject: ENUM_POLICY_SUBJECT.CUSTOMER,
        action: [ENUM_POLICY_ACTION.READ],
    })
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

    @MarketingSavedAudienceCreateDoc('client')
    @Response('marketingAudience.saved.create')
    @ClientCredentialProtected({
        subject: ENUM_POLICY_SUBJECT.CUSTOMER,
        action: [ENUM_POLICY_ACTION.CREATE],
    })
    @Post('/')
    async create(
        @WorkspacePayload() workspace: WorkspaceEntity,
        @ClientCredentialPayload() credential: ClientCredentialEntity,
        @Body() body: MarketingSavedAudienceCreateRequestDto
    ): Promise<IResponse<MarketingSavedAudienceGetResponseDto>> {
        const audience = await this.savedService.create(workspace.id, body);
        await this.log(
            ENUM_ACTIVITY_ACTION.CREATE,
            workspace,
            credential,
            audience
        );
        return { data: this.savedService.mapGet(audience) };
    }

    @MarketingSavedAudienceUpdateDoc('client')
    @Response('marketingAudience.saved.update')
    @ClientCredentialProtected({
        subject: ENUM_POLICY_SUBJECT.CUSTOMER,
        action: [ENUM_POLICY_ACTION.UPDATE],
    })
    @Patch(`/:${MARKETING_AUDIENCE_PARAM}`)
    async update(
        @WorkspacePayload() workspace: WorkspaceEntity,
        @ClientCredentialPayload() credential: ClientCredentialEntity,
        @Param(MARKETING_AUDIENCE_PARAM) id: string,
        @Body() body: MarketingSavedAudienceUpdateRequestDto
    ): Promise<IResponse<MarketingSavedAudienceGetResponseDto>> {
        const audience = await this.savedService.update(id, workspace.id, body);
        await this.log(
            ENUM_ACTIVITY_ACTION.UPDATE,
            workspace,
            credential,
            audience
        );
        return { data: this.savedService.mapGet(audience) };
    }

    @MarketingSavedAudienceDeleteDoc('client')
    @Response('marketingAudience.saved.delete')
    @ClientCredentialProtected({
        subject: ENUM_POLICY_SUBJECT.CUSTOMER,
        action: [ENUM_POLICY_ACTION.DELETE],
    })
    @HttpCode(HttpStatus.NO_CONTENT)
    @Delete(`/:${MARKETING_AUDIENCE_PARAM}`)
    async delete(
        @WorkspacePayload() workspace: WorkspaceEntity,
        @ClientCredentialPayload() credential: ClientCredentialEntity,
        @Param(MARKETING_AUDIENCE_PARAM) id: string
    ): Promise<void> {
        const audience = await this.savedService.delete(id, workspace.id);
        await this.log(
            ENUM_ACTIVITY_ACTION.DELETE,
            workspace,
            credential,
            audience
        );
    }

    private log(
        action: ENUM_ACTIVITY_ACTION,
        workspace: WorkspaceEntity,
        credential: ClientCredentialEntity,
        audience: MarketingSavedAudienceEntity
    ) {
        return this.activityService.createByUserWithWorkspace(
            credential.createdBy,
            workspace,
            {
                action,
                subject: ENUM_POLICY_SUBJECT.CUSTOMER,
                metadata: { id: audience.id, name: audience.name },
            }
        );
    }
}
