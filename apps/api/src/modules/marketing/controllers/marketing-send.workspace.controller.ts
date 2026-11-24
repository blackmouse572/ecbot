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
import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import {
    PaginationQuery,
    PaginationQueryFilterInEnum,
} from 'src/common/pagination/decorators/pagination.decorator';
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
    MARKETING_SEND_LIST_AVAILABLE_ORDER_BY,
    MARKETING_SEND_LIST_AVAILABLE_SEARCH,
} from '../constants/marketing-send.constant';
import { MARKETING_SEND_PARAM } from '../constants/marketing-send.doc.constant';
import {
    MarketingSendCreateDoc,
    MarketingSendGetDoc,
    MarketingSendListDoc,
    MarketingSendRepliesDoc,
    MarketingSendUpdateDoc,
} from '../docs/marketing-send.workspace.doc';
import { MarketingSendCreateRequestDto } from '../dtos/request/marketing-send.create.request.dto';
import { MarketingSendUpdateRequestDto } from '../dtos/request/marketing-send.update.request.dto';
import {
    MarketingSendGetResponseDto,
    MarketingSendListResponseDto,
    MarketingSendReplyResponseDto,
} from '../dtos/response/marketing-send.get.response.dto';
import { ENUM_MARKETING_SEND_MODE } from '../enums/marketing-send.enum';
import { MarketingSendEntity } from '../repository/entities/marketing-send.entity';
import { MarketingSendService } from '../services/marketing-send.service';

/** Gửi theo giai đoạn and Đã gửi (#506): start a send, see what it brought. */
@ApiTags('modules.workspace.marketingSend')
@FeatureFlagProtected(ENUM_FEATURE_FLAG.MARKETING)
@Controller({ version: '1', path: '/:workspace/marketing/sends' })
export class MarketingSendWorkspaceController {
    constructor(
        private readonly sendService: MarketingSendService,
        private readonly paginationService: PaginationService,
        private readonly activityService: ActivityService
    ) {}

    @MarketingSendCreateDoc()
    @Response('marketingSend.create')
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
        @Body() body: MarketingSendCreateRequestDto
    ): Promise<IResponse<MarketingSendGetResponseDto>> {
        const { name, mode, text, imageUrl, ...audience } = body;
        const send = await this.sendService.create(
            workspace.id,
            { name, mode, text, imageUrl, audience },
            user.id
        );
        await this.log(user, workspace, ENUM_ACTIVITY_ACTION.CREATE, send);
        return { data: await this.sendService.mapGet(send) };
    }

    @MarketingSendListDoc()
    @ResponsePaging('marketingSend.list')
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
            availableSearch: MARKETING_SEND_LIST_AVAILABLE_SEARCH,
            availableOrderBy: MARKETING_SEND_LIST_AVAILABLE_ORDER_BY,
            defaultOrderBy: 'createdAt',
            defaultOrderDirection: ENUM_PAGINATION_ORDER_DIRECTION_TYPE.DESC,
        })
        { _search, _limit, _offset, _order }: PaginationListDto,
        @PaginationQueryFilterInEnum(
            'mode',
            undefined,
            ENUM_MARKETING_SEND_MODE
        )
        mode?: Record<string, any>
    ): Promise<IResponsePaging<MarketingSendListResponseDto>> {
        const find: Record<string, any> = { ..._search, ...mode };
        const [sends, total] = await Promise.all([
            this.sendService.findAll(workspace.id, find, {
                paging: { limit: _limit, offset: _offset },
                order: _order,
            }),
            this.sendService.getTotal(workspace.id, find),
        ]);
        return {
            _pagination: {
                total,
                totalPage: this.paginationService.totalPage(total, _limit),
            },
            data: await this.sendService.mapList(sends),
        };
    }

    @MarketingSendGetDoc()
    @Response('marketingSend.get')
    @WorkspacePolicyAbilityProtected({
        subject: ENUM_POLICY_SUBJECT.MARKETING,
        action: [ENUM_POLICY_ACTION.READ],
    })
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Get(`/:${MARKETING_SEND_PARAM}`)
    async get(
        @WorkspacePayload() workspace: WorkspaceEntity,
        @Param(MARKETING_SEND_PARAM) id: string
    ): Promise<IResponse<MarketingSendGetResponseDto>> {
        const send = await this.sendService.findOneOrFail(id, workspace.id);
        return { data: await this.sendService.mapGet(send) };
    }

    @MarketingSendUpdateDoc()
    @Response('marketingSend.update')
    @WorkspacePolicyAbilityProtected({
        subject: ENUM_POLICY_SUBJECT.MARKETING,
        action: [ENUM_POLICY_ACTION.UPDATE],
    })
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Patch(`/:${MARKETING_SEND_PARAM}`)
    async update(
        @WorkspacePayload() workspace: WorkspaceEntity,
        @AuthJwtPayload('user', UserParsePipe) user: UserEntity,
        @Param(MARKETING_SEND_PARAM) id: string,
        @Body() body: MarketingSendUpdateRequestDto
    ): Promise<IResponse<MarketingSendGetResponseDto>> {
        const send = await this.sendService.update(id, workspace.id, body);
        await this.log(user, workspace, ENUM_ACTIVITY_ACTION.UPDATE, send);
        return { data: await this.sendService.mapGet(send) };
    }

    @MarketingSendRepliesDoc()
    @ResponsePaging('marketingSend.replies')
    @WorkspacePolicyAbilityProtected({
        subject: ENUM_POLICY_SUBJECT.MARKETING,
        action: [ENUM_POLICY_ACTION.READ],
    })
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Get(`/:${MARKETING_SEND_PARAM}/replies`)
    async replies(
        @WorkspacePayload() workspace: WorkspaceEntity,
        @Param(MARKETING_SEND_PARAM) id: string,
        @PaginationQuery() { _limit, _offset }: PaginationListDto
    ): Promise<IResponsePaging<MarketingSendReplyResponseDto>> {
        const send = await this.sendService.findOneOrFail(id, workspace.id);
        const [replies, stats] = await Promise.all([
            this.sendService.replies(send.id, _limit, _offset),
            this.sendService.stats(send.id),
        ]);
        return {
            _pagination: {
                total: stats.replied,
                totalPage: this.paginationService.totalPage(
                    stats.replied,
                    _limit
                ),
            },
            data: this.sendService.mapReplies(replies),
        };
    }

    private log(
        user: UserEntity,
        workspace: WorkspaceEntity,
        action: ENUM_ACTIVITY_ACTION,
        send: MarketingSendEntity
    ) {
        return this.activityService.createByUserWithWorkspace(user, workspace, {
            action,
            subject: ENUM_POLICY_SUBJECT.MARKETING,
            metadata: { id: send.id, name: send.name, mode: send.mode },
        });
    }
}
