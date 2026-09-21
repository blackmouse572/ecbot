import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import {
    PaginationQuery,
    PaginationQueryFilterDate,
    PaginationQueryFilterEqual,
    PaginationQueryFilterInEnum,
} from 'src/common/pagination/decorators/pagination.decorator';
import { PaginationListDto } from 'src/common/pagination/dtos/pagination.list.dto';
import { PaginationService } from 'src/common/pagination/services/pagination.service';
import { ResponsePaging } from 'src/common/response/decorators/response.decorator';
import { IResponsePaging } from 'src/common/response/interfaces/response.interface';
import { ApiKeyProtected } from 'src/modules/api-key/decorators/api-key.decorator';
import { AuthJwtAccessProtected } from 'src/modules/auth/decorators/auth.jwt.decorator';
import { PASSWORD_HISTORY_DEFAULT_AVAILABLE_SEARCH } from 'src/modules/password-history/constants/password-history.list.constant';
import { PasswordHistoryAdminGlobalListDoc } from 'src/modules/password-history/docs/password-history.admin.doc';
import { PasswordHistoryAdminListResponseDto } from 'src/modules/password-history/dtos/response/password-history.admin-list.response.dto';
import { ENUM_PASSWORD_HISTORY_TYPE } from 'src/modules/password-history/enums/password-history.enum';
import { PasswordHistoryService } from 'src/modules/password-history/services/password-history.service';
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
import { PasswordHistoryEntity } from 'src/modules/password-history/repository/entities/password-history.entity';

@ApiTags('modules.admin.passwordHistory')
@Controller({
    version: '1',
    path: '/password-history',
})
export class PasswordHistoryAdminGlobalController {
    constructor(
        private readonly paginationService: PaginationService,
        private readonly passwordHistoryService: PasswordHistoryService
    ) {}

    @PasswordHistoryAdminGlobalListDoc()
    @ResponsePaging('passwordHistory.list')
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
            availableSearch: PASSWORD_HISTORY_DEFAULT_AVAILABLE_SEARCH,
        })
        { _search, _limit, _offset, _order }: PaginationListDto,
        @PaginationQueryFilterInEnum(
            'type',
            undefined,
            ENUM_PASSWORD_HISTORY_TYPE
        )
        _type?: Record<string, any>,
        @PaginationQueryFilterEqual('user') _user?: Record<string, any>,
        @PaginationQueryFilterDate('createdAt') _createdAt?: Record<string, any>
    ): Promise<IResponsePaging<PasswordHistoryAdminListResponseDto>> {
        const find: Record<string, any> = {
            ..._search,
            ...(_type ? _type : {}),
            ...(_user ? _user : {}),
            ...(_createdAt ? _createdAt : {}),
        };

        const histories: PasswordHistoryEntity[] =
            await this.passwordHistoryService.findAll(find, {
                limit: _limit,
                offset: _offset,
                orderBy: _order,
            });
        const total: number = await this.passwordHistoryService.getTotal(find);
        const totalPage: number = this.paginationService.totalPage(
            total,
            _limit
        );

        return {
            _pagination: { total, totalPage },
            data: this.passwordHistoryService.mapAdminList(histories),
        };
    }
}
