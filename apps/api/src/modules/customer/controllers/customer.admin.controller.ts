import { ENUM_ACCOUNT_TYPE } from '@app/modules/account/enums/account.enum';
import {
    Controller,
    Get,
    NotFoundException,
    Param,
    ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ENUM_APP_STATUS_CODE_ERROR } from 'src/app/enums/app.status-code.enum';
import {
    PaginationQuery,
    PaginationQueryFilterEqual,
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
import {
    CUSTOMER_ADMIN_AVAILABLE_SEARCH,
    CUSTOMER_DEFAULT_AVAILABLE_ORDER_BY,
} from '../constants/customer.list.constant';
import {
    CustomerAdminGetDoc,
    CustomerAdminListDoc,
} from '../docs/customer.admin.doc';
import { CustomerAdminGetResponseDto } from '../dtos/response/customer.admin-get.response.dto';
import { CustomerAdminListResponseDto } from '../dtos/response/customer.admin-list.response.dto';
import { CustomerAdminService } from '../services/customer.admin.service';

/** Admins see customers; the data stays the workspace's to edit. */
@ApiTags('modules.admin.customer')
@Controller({
    version: '1',
    path: '/customer',
})
export class CustomerAdminController {
    constructor(
        private readonly customerAdminService: CustomerAdminService,
        private readonly paginationService: PaginationService
    ) {}

    @CustomerAdminListDoc()
    @ResponsePaging('customer.admin.list')
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
            availableSearch: CUSTOMER_ADMIN_AVAILABLE_SEARCH,
            availableOrderBy: CUSTOMER_DEFAULT_AVAILABLE_ORDER_BY,
            defaultOrderBy: 'createdAt',
            defaultOrderDirection: ENUM_PAGINATION_ORDER_DIRECTION_TYPE.DESC,
        })
        { _search, _limit, _offset, _order }: PaginationListDto,
        @PaginationQueryFilterEqual('workspace')
        _workspace?: Record<string, any>,
        @PaginationQueryFilterEqual('tag') _tag?: Record<string, any>,
        @PaginationQueryFilterInEnum('platform', undefined, ENUM_ACCOUNT_TYPE, {
            queryField: 'channel',
        })
        _channel?: Record<string, any>
    ): Promise<IResponsePaging<CustomerAdminListResponseDto>> {
        const find: Record<string, any> = {
            ..._search,
            ..._workspace,
            ..._tag,
            ..._channel,
        };
        const [data, total] = await Promise.all([
            this.customerAdminService.findAll(find, {
                limit: _limit,
                offset: _offset,
                // id breaks ties, so rows with the same createdAt keep their
                // place from page to page.
                order: {
                    ..._order,
                    id: ENUM_PAGINATION_ORDER_DIRECTION_TYPE.DESC,
                },
            }),
            this.customerAdminService.getTotal(find),
        ]);
        const totalPage = this.paginationService.totalPage(total, _limit);
        return { _pagination: { total, totalPage }, data };
    }

    @CustomerAdminGetDoc()
    @Response('customer.admin.get')
    @PolicyAbilityProtected({
        subject: ENUM_POLICY_SUBJECT.CUSTOMER,
        action: [ENUM_POLICY_ACTION.READ],
    })
    @PolicyRoleProtected(ENUM_POLICY_ROLE_TYPE.ADMIN)
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Get('/get/:customer')
    async get(
        @Param('customer', ParseUUIDPipe) id: string
    ): Promise<IResponse<CustomerAdminGetResponseDto>> {
        const customer = await this.customerAdminService.findOneById(id);
        if (!customer) {
            throw new NotFoundException({
                statusCode: ENUM_APP_STATUS_CODE_ERROR.NOT_FOUND,
                message: 'customer.error.notFound',
            });
        }
        return { data: customer };
    }
}
