import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import {
    PaginationQuery,
    PaginationQueryFilterDate,
    PaginationQueryFilterEqual,
    PaginationQueryFilterInEnum,
} from 'src/common/pagination/decorators/pagination.decorator';
import { ENUM_PAGINATION_ORDER_DIRECTION_TYPE } from 'src/common/pagination/enums/pagination.enum';
import { PaginationListDto } from 'src/common/pagination/dtos/pagination.list.dto';
import { PaginationService } from 'src/common/pagination/services/pagination.service';
import { ResponsePaging } from 'src/common/response/decorators/response.decorator';
import { IResponsePaging } from 'src/common/response/interfaces/response.interface';
import { ApiKeyProtected } from 'src/modules/api-key/decorators/api-key.decorator';
import { AuthJwtAccessProtected } from 'src/modules/auth/decorators/auth.jwt.decorator';
import {
    PolicyAbilityProtected,
    PolicyRoleProtected,
} from 'src/modules/policy/decorators/policy.decorator';
import {
    ENUM_POLICY_ACTION,
    ENUM_POLICY_ROLE_TYPE,
    ENUM_POLICY_SUBJECT,
} from 'src/modules/policy/enums/policy.enum';
import { UserProtected } from 'src/modules/user/decorators/user.decorator';
import { ACTIVITY_ADMIN_AVAILABLE_SEARCH } from '../constants/activity.list.constant';
import { ActivityAdminGlobalListDoc } from '../docs/activity.admin.doc';
import { ActivityAdminListResponseDto } from '../dtos/response/activity.admin-list.response.dto';
import { ENUM_ACTIVITY_ACTION } from '../enums/activity.enum';
import { ActivityService } from '../services/activity.service';

@ApiTags('modules.admin.activity')
@Controller({
    version: '1',
    path: '/activity',
})
export class ActivityAdminGlobalController {
    constructor(
        private readonly paginationService: PaginationService,
        private readonly activityService: ActivityService
    ) {}

    @ActivityAdminGlobalListDoc()
    @ResponsePaging('activity.list')
    @PolicyAbilityProtected({
        subject: ENUM_POLICY_SUBJECT.ACTIVITY,
        action: [ENUM_POLICY_ACTION.READ],
    })
    @PolicyRoleProtected(ENUM_POLICY_ROLE_TYPE.ADMIN)
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Get('/list')
    async list(
        @PaginationQuery({
            availableSearch: ACTIVITY_ADMIN_AVAILABLE_SEARCH,
            defaultOrderBy: 'createdAt',
            defaultOrderDirection: ENUM_PAGINATION_ORDER_DIRECTION_TYPE.DESC,
        })
        { _search, _limit, _offset, _order }: PaginationListDto,
        @PaginationQueryFilterInEnum('action', undefined, ENUM_ACTIVITY_ACTION)
        _action?: Record<string, any>,
        @PaginationQueryFilterInEnum('subject', undefined, ENUM_POLICY_SUBJECT)
        _subject?: Record<string, any>,
        @PaginationQueryFilterEqual('by') _by?: Record<string, any>,
        @PaginationQueryFilterEqual('user') _user?: Record<string, any>,
        @PaginationQueryFilterEqual('workspace')
        _workspace?: Record<string, any>,
        @PaginationQueryFilterDate('createdAt') _createdAt?: Record<string, any>
    ): Promise<IResponsePaging<ActivityAdminListResponseDto>> {
        const find: Record<string, any> = {
            ..._search,
            ..._action,
            ..._subject,
            ..._by,
            ..._user,
            ..._workspace,
            ..._createdAt,
        };

        const activities = await this.activityService.findAll(find, {
            paging: { limit: _limit, offset: _offset },
            order: _order,
            populate: ['by', 'user', 'workspace'],
        });
        const total = await this.activityService.getTotal(find);
        const totalPage = this.paginationService.totalPage(total, _limit);

        return {
            _pagination: { total, totalPage },
            data: this.activityService.mapAdminList(activities),
        };
    }
}
