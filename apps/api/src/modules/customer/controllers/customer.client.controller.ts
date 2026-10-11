import { PaginationQuery } from '@app/common/pagination/decorators/pagination.decorator';
import { PaginationListDto } from '@app/common/pagination/dtos/pagination.list.dto';
import { ENUM_PAGINATION_ORDER_DIRECTION_TYPE } from '@app/common/pagination/enums/pagination.enum';
import { PaginationService } from '@app/common/pagination/services/pagination.service';
import {
    Response,
    ResponsePaging,
} from '@app/common/response/decorators/response.decorator';
import {
    IResponse,
    IResponsePaging,
} from '@app/common/response/interfaces/response.interface';
import { ActivityService } from '@app/modules/activity/services/activity.service';
import {
    ClientCredentialPayload,
    ClientCredentialProtected,
} from '@app/modules/client-credential/decorators/client-credential.decorator';
import { ClientCredentialEntity } from '@app/modules/client-credential/repository/entities/client-credential.entity';
import { ENUM_POLICY_SUBJECT } from '@app/modules/policy/enums/policy.enum';
import { WorkspacePayload } from '@app/modules/workspace/decorators/workspace.decorator';
import { WorkspaceEntity } from '@app/modules/workspace/repository/entities/workspace.entity';
import { Controller, Get, NotFoundException, Param } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import {
    CUSTOMER_DEFAULT_AVAILABLE_ORDER_BY,
    CUSTOMER_DEFAULT_AVAILABLE_SEARCH,
} from '../constants/customer.list.constant';
import {
    CustomerClientGetDoc,
    CustomerClientListDoc,
} from '../docs/customer.client.doc';
import { CustomerGetResponseDto } from '../dtos/response/customer.get.response.dto';
import { CustomerService } from '../services/customer.service';

// 3rd-party surface: authenticated by x-api-key (ClientCredential), tenant
// derived from the credential (no :workspace param). See ADR-0012. Reading a
// customer is logged as a view by the credential's creator.
@ApiTags('modules.client.customer')
@Controller('/customers')
export class CustomerClientController {
    constructor(
        private readonly customerService: CustomerService,
        private readonly activityService: ActivityService,
        private readonly paginationService: PaginationService
    ) {}

    @CustomerClientListDoc()
    @ResponsePaging('customer.workspace.list')
    @ClientCredentialProtected()
    @Get('/')
    async list(
        @WorkspacePayload() workspace: WorkspaceEntity,
        @PaginationQuery({
            availableSearch: CUSTOMER_DEFAULT_AVAILABLE_SEARCH,
            availableOrderBy: CUSTOMER_DEFAULT_AVAILABLE_ORDER_BY,
            defaultOrderBy: 'createdAt',
            defaultOrderDirection: ENUM_PAGINATION_ORDER_DIRECTION_TYPE.DESC,
        })
        { _search, _limit, _offset, _order }: PaginationListDto
    ): Promise<IResponsePaging<CustomerGetResponseDto>> {
        const find: Record<string, any> = { ..._search };

        const [customers, total] = await Promise.all([
            this.customerService.findByWorkspace(workspace.id, find, {
                paging: { limit: _limit, offset: _offset },
                // id breaks ties, so rows keep their place between pages.
                order: {
                    ..._order,
                    id: ENUM_PAGINATION_ORDER_DIRECTION_TYPE.DESC,
                },
            }),
            this.customerService.countByWorkspace(workspace.id, find),
        ]);

        return {
            _pagination: {
                total,
                totalPage: this.paginationService.totalPage(total, _limit),
            },
            data: this.customerService.mapList(customers),
        };
    }

    @CustomerClientGetDoc()
    @Response('customer.workspace.get')
    @ClientCredentialProtected()
    @Get('/:id')
    async get(
        @WorkspacePayload() workspace: WorkspaceEntity,
        @ClientCredentialPayload() credential: ClientCredentialEntity,
        @Param('id') id: string
    ): Promise<IResponse<CustomerGetResponseDto>> {
        // Missing and cross-workspace look the same: 404.
        const customer = await this.customerService.findOneByIdInWorkspace(
            id,
            workspace.id
        );
        if (!customer) {
            throw new NotFoundException({
                message: 'customer.error.notFound',
                statusCode: 404,
            });
        }

        await this.activityService.createView(
            credential.createdBy?.id,
            workspace,
            ENUM_POLICY_SUBJECT.CUSTOMER,
            { id: customer.id }
        );

        return { data: this.customerService.mapGet(customer) };
    }
}
