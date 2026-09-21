import { ENUM_POLICY_SUBJECT } from '@app/modules/policy/enums/policy.enum';
import {
    WorkspaceMemberOrOwnerProtected,
    WorkspacePayload,
} from '@app/modules/workspace/decorators/workspace.decorator';
import { WorkspaceEntity } from '@app/modules/workspace/repository/entities/workspace.entity';
import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import {
    PaginationQuery,
    PaginationQueryFilterEqual,
    PaginationQueryFilterInEnum,
} from 'src/common/pagination/decorators/pagination.decorator';
import { PaginationListDto } from 'src/common/pagination/dtos/pagination.list.dto';
import { PaginationService } from 'src/common/pagination/services/pagination.service';
import { RequestRequiredPipe } from 'src/common/request/pipes/request.required.pipe';
import { ResponsePaging } from 'src/common/response/decorators/response.decorator';
import { IResponsePaging } from 'src/common/response/interfaces/response.interface';
import { ActivityListResponseDto } from 'src/modules/activity/dtos/response/activity.list.response.dto';
import { IActivityDoc } from 'src/modules/activity/interfaces/activity.interface';
import { ActivityService } from 'src/modules/activity/services/activity.service';
import { ApiKeyProtected } from 'src/modules/api-key/decorators/api-key.decorator';
import {
    AuthJwtAccessProtected,
    AuthJwtPayload,
} from 'src/modules/auth/decorators/auth.jwt.decorator';
import { UserProtected } from 'src/modules/user/decorators/user.decorator';
import { UserParsePipe } from 'src/modules/user/pipes/user.parse.pipe';
import { UserEntity } from 'src/modules/user/repository/entities/user.entity';
import { ActivityWorkspaceListDoc } from '../docs/activity.workspace.doc';
import { ENUM_ACTIVITY_ACTION } from '../enums/activity.enum';

@ApiTags('modules.workspace.activity')
@Controller({
    version: '1',
    path: '/activity/:workspace',
})
export class ActivityWorkspaceController {
    constructor(
        private readonly paginationService: PaginationService,
        private readonly activityService: ActivityService
    ) {}

    @ActivityWorkspaceListDoc()
    @ResponsePaging('activity.list')
    @WorkspaceMemberOrOwnerProtected()
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Get('/list')
    async list(
        @AuthJwtPayload('user', RequestRequiredPipe, UserParsePipe)
        user: UserEntity,
        @PaginationQuery()
        { _search, _limit, _offset, _order }: PaginationListDto,
        @WorkspacePayload() workspace: WorkspaceEntity,
        @PaginationQueryFilterInEnum('action', undefined, ENUM_ACTIVITY_ACTION)
        _action?: Record<string, any>,
        @PaginationQueryFilterInEnum('subject', undefined, ENUM_POLICY_SUBJECT)
        _subject?: Record<string, any>,
        @PaginationQueryFilterEqual('user') _user?: Record<string, any>,
        @PaginationQueryFilterEqual('by') _by?: Record<string, any>
    ): Promise<IResponsePaging<ActivityListResponseDto>> {
        const find: Record<string, any> = {
            ..._search,
            ..._action,
            ..._subject,
            workspace: workspace.id,
        };

        if (_user) {
            find.user = _user;
        }

        if (_by) {
            find.by = _by;
        }

        let userHistories: IActivityDoc[];

        if (user.id == workspace.owner.id) {
            // Owner can see all activities
            userHistories = await this.activityService.findAll(find, {
                paging: {
                    limit: _limit,
                    offset: _offset,
                },
                order: _order,
            });
        } else {
            // Member can only see their own activities
            userHistories = await this.activityService.findAllByUser(
                user.id,
                find,
                {
                    paging: {
                        limit: _limit,
                        offset: _offset,
                    },
                    order: _order,
                }
            );
        }

        let total: number;
        if (user.id == workspace.owner.id) {
            total = await this.activityService.getTotal(find);
        } else {
            total = await this.activityService.getTotalByUser(user.id, find);
        }

        const totalPage: number = this.paginationService.totalPage(
            total,
            _limit
        );

        const mapped = this.activityService.mapList(userHistories);

        return {
            _pagination: { total, totalPage },
            data: mapped,
        };
    }
}
