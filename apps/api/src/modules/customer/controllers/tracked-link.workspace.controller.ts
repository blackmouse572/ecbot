import { ENUM_ACTIVITY_ACTION } from '@app/modules/activity/enums/activity.enum';
import { ActivityService } from '@app/modules/activity/services/activity.service';
import { ApiKeyProtected } from '@app/modules/api-key/decorators/api-key.decorator';
import {
    AuthJwtAccessProtected,
    AuthJwtPayload,
} from '@app/modules/auth/decorators/auth.jwt.decorator';
import {
    ENUM_POLICY_ACTION,
    ENUM_POLICY_SUBJECT,
} from '@app/modules/policy/enums/policy.enum';
import { UserProtected } from '@app/modules/user/decorators/user.decorator';
import { UserParsePipe } from '@app/modules/user/pipes/user.parse.pipe';
import { UserEntity } from '@app/modules/user/repository/entities/user.entity';
import {
    WorkspacePayload,
    WorkspaceScopedProtected,
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
import {
    PaginationQuery,
    PaginationQueryFilterEqual,
    PaginationQueryFilterInEnum,
} from 'src/common/pagination/decorators/pagination.decorator';
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
    TRACKED_LINK_AVAILABLE_SEARCH,
    TRACKED_LINK_PARAM,
} from '../constants/tracked-link.constant';
import {
    TrackedLinkWorkspaceCreateChildDoc,
    TrackedLinkWorkspaceCreateDoc,
    TrackedLinkWorkspaceDeleteDoc,
    TrackedLinkWorkspaceGetDoc,
    TrackedLinkWorkspaceListDoc,
    TrackedLinkWorkspaceUpdateDoc,
} from '../docs/tracked-link.workspace.doc';
import { TrackedLinkCreateChildRequestDto } from '../dtos/request/tracked-link.create-child.request.dto';
import { TrackedLinkCreateRequestDto } from '../dtos/request/tracked-link.create.request.dto';
import { TrackedLinkUpdateRequestDto } from '../dtos/request/tracked-link.update.request.dto';
import { TrackedLinkDetailResponseDto } from '../dtos/response/tracked-link.detail.response.dto';
import { TrackedLinkGetResponseDto } from '../dtos/response/tracked-link.get.response.dto';
import { ENUM_TRACKED_LINK_STATUS } from '../enums/tracked-link.enum';
import { TrackedLinkService } from '../services/tracked-link.service';

@ApiTags('modules.workspace.trackedLink')
@Controller({
    version: '1',
    path: ':workspace/tracked-links',
})
export class TrackedLinkWorkspaceController {
    constructor(
        private readonly trackedLinkService: TrackedLinkService,
        private readonly paginationService: PaginationService,
        private readonly activityService: ActivityService
    ) {}

    @TrackedLinkWorkspaceListDoc()
    @ResponsePaging('trackedLink.workspace.list')
    @WorkspaceScopedProtected({
        subject: ENUM_POLICY_SUBJECT.CUSTOMER,
        action: [ENUM_POLICY_ACTION.READ],
    })
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Get('/')
    async list(
        @WorkspacePayload() workspace: WorkspaceEntity,
        @PaginationQuery({ availableSearch: TRACKED_LINK_AVAILABLE_SEARCH })
        { _search, _limit, _offset, _order }: PaginationListDto,
        @PaginationQueryFilterEqual('account.id', { queryField: 'account' })
        account: Record<string, any>,
        @PaginationQueryFilterInEnum(
            'status',
            Object.values(ENUM_TRACKED_LINK_STATUS),
            ENUM_TRACKED_LINK_STATUS
        )
        status: Record<string, any>
    ): Promise<IResponsePaging<TrackedLinkGetResponseDto>> {
        // Sources only: QR and KOL links are listed on their source's page.
        const find: Record<string, any> = {
            ..._search,
            ...account,
            ...status,
            workspace: workspace.id,
            parent: null,
            deletedAt: null,
        };
        const links = await this.trackedLinkService.findAll(find, {
            paging: { limit: _limit, offset: _offset },
            order: _order,
        });
        const total = await this.trackedLinkService.getTotal(find);

        return {
            _pagination: {
                total,
                totalPage: this.paginationService.totalPage(total, _limit),
            },
            data: this.trackedLinkService.mapList(links),
        };
    }

    @TrackedLinkWorkspaceGetDoc()
    @Response('trackedLink.workspace.get')
    @WorkspaceScopedProtected({
        subject: ENUM_POLICY_SUBJECT.CUSTOMER,
        action: [ENUM_POLICY_ACTION.READ],
    })
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Get(`/:${TRACKED_LINK_PARAM}`)
    async get(
        @WorkspacePayload() workspace: WorkspaceEntity,
        @Param(TRACKED_LINK_PARAM) id: string
    ): Promise<IResponse<TrackedLinkDetailResponseDto>> {
        const link = await this.trackedLinkService.findOneInWorkspace(
            workspace.id,
            id
        );
        const children = await this.trackedLinkService.findChildren(link.id);
        return { data: this.trackedLinkService.mapDetail(link, children) };
    }

    @TrackedLinkWorkspaceCreateDoc()
    @Response('trackedLink.workspace.create')
    @WorkspaceScopedProtected({
        subject: ENUM_POLICY_SUBJECT.CUSTOMER,
        action: [ENUM_POLICY_ACTION.CREATE],
    })
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Post('/')
    async create(
        @WorkspacePayload() workspace: WorkspaceEntity,
        @Body() dto: TrackedLinkCreateRequestDto,
        @AuthJwtPayload('user', UserParsePipe) user: UserEntity
    ): Promise<IResponse<TrackedLinkGetResponseDto>> {
        const link = await this.trackedLinkService.create(workspace.id, dto);
        await this.log(user, workspace, ENUM_ACTIVITY_ACTION.CREATE, link);
        const created = await this.trackedLinkService.findOneInWorkspace(
            workspace.id,
            link.id
        );
        return { data: this.trackedLinkService.mapGet(created) };
    }

    @TrackedLinkWorkspaceCreateChildDoc()
    @Response('trackedLink.workspace.createChild')
    @WorkspaceScopedProtected({
        subject: ENUM_POLICY_SUBJECT.CUSTOMER,
        action: [ENUM_POLICY_ACTION.CREATE],
    })
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Post(`/:${TRACKED_LINK_PARAM}/links`)
    async createChild(
        @WorkspacePayload() workspace: WorkspaceEntity,
        @Param(TRACKED_LINK_PARAM) id: string,
        @Body() dto: TrackedLinkCreateChildRequestDto,
        @AuthJwtPayload('user', UserParsePipe) user: UserEntity
    ): Promise<IResponse<TrackedLinkGetResponseDto>> {
        const link = await this.trackedLinkService.createChild(
            workspace.id,
            id,
            dto
        );
        await this.log(user, workspace, ENUM_ACTIVITY_ACTION.CREATE, link);
        const created = await this.trackedLinkService.findOneInWorkspace(
            workspace.id,
            link.id
        );
        return { data: this.trackedLinkService.mapGet(created) };
    }

    @TrackedLinkWorkspaceUpdateDoc()
    @Response('trackedLink.workspace.update')
    @WorkspaceScopedProtected({
        subject: ENUM_POLICY_SUBJECT.CUSTOMER,
        action: [ENUM_POLICY_ACTION.UPDATE],
    })
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Patch(`/:${TRACKED_LINK_PARAM}`)
    async update(
        @WorkspacePayload() workspace: WorkspaceEntity,
        @Param(TRACKED_LINK_PARAM) id: string,
        @Body() dto: TrackedLinkUpdateRequestDto,
        @AuthJwtPayload('user', UserParsePipe) user: UserEntity
    ): Promise<IResponse<TrackedLinkGetResponseDto>> {
        const link = await this.trackedLinkService.update(
            workspace.id,
            id,
            dto
        );
        await this.log(user, workspace, ENUM_ACTIVITY_ACTION.UPDATE, link);
        return { data: this.trackedLinkService.mapGet(link) };
    }

    @TrackedLinkWorkspaceDeleteDoc()
    @Response('trackedLink.workspace.delete')
    @WorkspaceScopedProtected({
        subject: ENUM_POLICY_SUBJECT.CUSTOMER,
        action: [ENUM_POLICY_ACTION.DELETE],
    })
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @HttpCode(HttpStatus.NO_CONTENT)
    @Delete(`/:${TRACKED_LINK_PARAM}`)
    async delete(
        @WorkspacePayload() workspace: WorkspaceEntity,
        @Param(TRACKED_LINK_PARAM) id: string,
        @AuthJwtPayload('user', UserParsePipe) user: UserEntity
    ): Promise<void> {
        const link = await this.trackedLinkService.findOneInWorkspace(
            workspace.id,
            id
        );
        await this.trackedLinkService.delete(workspace.id, id);
        await this.log(user, workspace, ENUM_ACTIVITY_ACTION.DELETE, link);
    }

    private async log(
        user: UserEntity,
        workspace: WorkspaceEntity,
        action: ENUM_ACTIVITY_ACTION,
        link: { id: string; name: string; code: string }
    ): Promise<void> {
        await this.activityService.createByUserWithWorkspace(user, workspace, {
            action,
            subject: ENUM_POLICY_SUBJECT.CUSTOMER,
            metadata: { id: link.id, name: link.name, code: link.code },
        });
    }
}
