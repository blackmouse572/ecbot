import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import {
    PaginationQuery,
    PaginationQueryFilterInEnum,
} from 'src/common/pagination/decorators/pagination.decorator';
import { PaginationListDto } from 'src/common/pagination/dtos/pagination.list.dto';
import { PaginationService } from 'src/common/pagination/services/pagination.service';
import { RequestRequiredPipe } from 'src/common/request/pipes/request.required.pipe';
import { ResponsePaging } from 'src/common/response/decorators/response.decorator';
import { IResponsePaging } from 'src/common/response/interfaces/response.interface';
import { ActivityAdminListDoc } from 'src/modules/activity/docs/activity.admin.doc';
import { ActivityListResponseDto } from 'src/modules/activity/dtos/response/activity.list.response.dto';
import { ENUM_ACTIVITY_ACTION } from 'src/modules/activity/enums/activity.enum';
import { ActivityService } from 'src/modules/activity/services/activity.service';
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
import {
    UserParam,
    UserProtected,
} from 'src/modules/user/decorators/user.decorator';
import { UserParsePipe } from 'src/modules/user/pipes/user.parse.pipe';
import { UserEntity } from 'src/modules/user/repository/entities/user.entity';
import { ActivityEntity } from '../repository/entities/activity.entity';

@ApiTags('modules.admin.activity')
@Controller({
    version: '1',
    path: '/activity/:user',
})
export class ActivityAdminController {
    constructor(
        private readonly paginationService: PaginationService,
        private readonly activityService: ActivityService
    ) {}

    @ActivityAdminListDoc()
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
        @UserParam('user', RequestRequiredPipe, UserParsePipe) user: UserEntity,
        @PaginationQuery()
        { _limit, _offset, _order }: PaginationListDto,
        @PaginationQueryFilterInEnum('action', undefined, ENUM_ACTIVITY_ACTION)
        _action?: Record<string, any>,
        @PaginationQueryFilterInEnum('subject', undefined, ENUM_POLICY_SUBJECT)
        _subject?: Record<string, any>
    ): Promise<IResponsePaging<ActivityListResponseDto>> {
        const find: Record<string, any> = { ..._action, ..._subject };
        const userHistories: ActivityEntity[] =
            await this.activityService.findAllByUser(user.id, find, {
                paging: {
                    limit: _limit,
                    offset: _offset,
                },
                order: _order,
            });
        const total: number = await this.activityService.getTotalByUser(
            user.id,
            find
        );
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
