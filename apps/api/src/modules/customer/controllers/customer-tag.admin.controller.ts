import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import {
    PaginationQuery,
    PaginationQueryFilterEqual,
} from 'src/common/pagination/decorators/pagination.decorator';
import { PaginationListDto } from 'src/common/pagination/dtos/pagination.list.dto';
import { ENUM_PAGINATION_ORDER_DIRECTION_TYPE } from 'src/common/pagination/enums/pagination.enum';
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
import { CUSTOMER_TAG_ADMIN_AVAILABLE_SEARCH } from '../constants/customer.list.constant';
import { CustomerTagAdminListDoc } from '../docs/customer-tag.admin.doc';
import { CustomerTagAdminListResponseDto } from '../dtos/response/customer-tag.admin-list.response.dto';
import { CustomerTagAdminService } from '../services/customer-tag.admin.service';

/** Admins see every workspace's customer tags; they never edit them. */
@ApiTags('modules.admin.customer-tag')
@Controller({
    version: '1',
    path: '/customer-tag',
})
export class CustomerTagAdminController {
    constructor(
        private readonly customerTagAdminService: CustomerTagAdminService,
        private readonly paginationService: PaginationService
    ) {}

    @CustomerTagAdminListDoc()
    @ResponsePaging('customer.admin.tagList')
    @PolicyAbilityProtected({
        subject: ENUM_POLICY_SUBJECT.CUSTOMER,
        action: [ENUM_POLICY_ACTION.READ],
    })
    @PolicyRoleProtected(ENUM_POLICY_ROLE_TYPE.ADMIN)
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Get('/list')
    async list(
        @PaginationQuery({
            availableSearch: CUSTOMER_TAG_ADMIN_AVAILABLE_SEARCH,
            availableOrderBy: ['createdAt', 'name'],
            defaultOrderBy: 'createdAt',
            defaultOrderDirection: ENUM_PAGINATION_ORDER_DIRECTION_TYPE.DESC,
        })
        { _search, _limit, _offset, _order }: PaginationListDto,
        @PaginationQueryFilterEqual('workspace')
        _workspace?: Record<string, any>
    ): Promise<IResponsePaging<CustomerTagAdminListResponseDto>> {
        const find: Record<string, any> = { ..._search, ..._workspace };
        const [data, total] = await Promise.all([
            this.customerTagAdminService.findAll(find, {
                limit: _limit,
                offset: _offset,
                order: {
                    ..._order,
                    id: ENUM_PAGINATION_ORDER_DIRECTION_TYPE.DESC,
                },
            }),
            this.customerTagAdminService.getTotal(find),
        ]);
        const totalPage = this.paginationService.totalPage(total, _limit);
        return { _pagination: { total, totalPage }, data };
    }
}
