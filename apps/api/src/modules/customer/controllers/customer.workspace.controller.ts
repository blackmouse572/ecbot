import {
    IResponse,
    IResponsePaging,
} from '@app/common/response/interfaces/response.interface';
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
    NotFoundException,
    Param,
    Patch,
    Post,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ENUM_PAGINATION_ORDER_DIRECTION_TYPE } from 'src/common/pagination/enums/pagination.enum';
import { PaginationQuery } from 'src/common/pagination/decorators/pagination.decorator';
import { PaginationListDto } from 'src/common/pagination/dtos/pagination.list.dto';
import { PaginationService } from 'src/common/pagination/services/pagination.service';
import {
    Response,
    ResponsePaging,
} from 'src/common/response/decorators/response.decorator';
import {
    CUSTOMER_DEFAULT_AVAILABLE_ORDER_BY,
    CUSTOMER_DEFAULT_AVAILABLE_SEARCH,
} from '../constants/customer.list.constant';
import {
    CustomerWorkspaceEraseDoc,
    CustomerWorkspaceGetDoc,
    CustomerWorkspaceListDoc,
    CustomerWorkspaceUpdateDoc,
} from '../docs/customer.workspace.doc';
import { CustomerUpdateRequestDto } from '../dtos/request/customer.update.request.dto';
import { CustomerEraseResponseDto } from '../dtos/response/customer.erase.response.dto';
import { CustomerGetResponseDto } from '../dtos/response/customer.get.response.dto';
import { CustomerErasureService } from '../services/customer-erasure.service';
import { CustomerMergeSuggestionService } from '../services/customer-merge-suggestion.service';
import { CustomerService } from '../services/customer.service';

@ApiTags('modules.workspace.customer')
@Controller({
    version: '1',
    path: '/:workspace/customers',
})
export class CustomerWorkspaceController {
    constructor(
        private readonly customerService: CustomerService,
        private readonly mergeSuggestionService: CustomerMergeSuggestionService,
        private readonly activityService: ActivityService,
        private readonly paginationService: PaginationService,
        private readonly erasureService: CustomerErasureService
    ) {}

    @CustomerWorkspaceListDoc()
    @ResponsePaging('customer.workspace.list')
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
        @PaginationQuery({
            availableSearch: CUSTOMER_DEFAULT_AVAILABLE_SEARCH,
            availableOrderBy: CUSTOMER_DEFAULT_AVAILABLE_ORDER_BY,
            defaultOrderBy: 'createdAt',
            // Newest first: paging stops at page 20, so oldest-first hid new
            // customers in a large workspace.
            defaultOrderDirection: ENUM_PAGINATION_ORDER_DIRECTION_TYPE.DESC,
        })
        { _search, _limit, _offset, _order }: PaginationListDto
    ): Promise<IResponsePaging<CustomerGetResponseDto>> {
        const find: Record<string, any> = { ..._search };

        const [customers, total] = await Promise.all([
            this.customerService.findByWorkspace(workspace.id, find, {
                paging: { limit: _limit, offset: _offset },
                // id breaks ties, so rows with the same createdAt keep their
                // place from page to page.
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

    @CustomerWorkspaceGetDoc()
    @Response('customer.workspace.get')
    @WorkspaceScopedProtected({
        subject: ENUM_POLICY_SUBJECT.CUSTOMER,
        action: [ENUM_POLICY_ACTION.READ],
    })
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Get('/:id')
    async get(
        @WorkspacePayload() workspace: WorkspaceEntity,
        @Param('id') id: string,
        @AuthJwtPayload('user') userId: string
    ): Promise<IResponse<CustomerGetResponseDto>> {
        // BOLA guard — never return a customer from a different workspace,
        // collapse missing + cross-workspace into the same 404.
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
            userId,
            workspace,
            ENUM_POLICY_SUBJECT.CUSTOMER,
            { id: customer.id }
        );
        return { data: this.customerService.mapGet(customer) };
    }

    @CustomerWorkspaceUpdateDoc()
    @Response('customer.workspace.update')
    @WorkspaceScopedProtected({
        subject: ENUM_POLICY_SUBJECT.CUSTOMER,
        action: [ENUM_POLICY_ACTION.UPDATE],
    })
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Patch('/:id')
    async update(
        @WorkspacePayload() workspace: WorkspaceEntity,
        @Param('id') id: string,
        @Body() dto: CustomerUpdateRequestDto,
        @AuthJwtPayload('user', UserParsePipe) user: UserEntity
    ): Promise<IResponse<CustomerGetResponseDto>> {
        // BOLA guard — update() throws 404 when the id resolves outside the
        // workspace, so this also handles cross-workspace patching attempts.
        const updated = await this.customerService.update(
            id,
            dto,
            workspace.id
        );
        await this.activityService.createByUserWithWorkspace(user, workspace, {
            action: ENUM_ACTIVITY_ACTION.UPDATE,
            subject: ENUM_POLICY_SUBJECT.CUSTOMER,
            metadata: {
                id: updated.id,
                name: updated.name,
            },
        });
        return { data: this.customerService.mapGet(updated) };
    }

    @Response('customer.workspace.unmerge')
    @WorkspaceScopedProtected({
        subject: ENUM_POLICY_SUBJECT.CUSTOMER,
        action: [ENUM_POLICY_ACTION.UPDATE],
    })
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @HttpCode(HttpStatus.OK)
    @Post('/:id/unmerge')
    async unmerge(
        @WorkspacePayload() workspace: WorkspaceEntity,
        @Param('id') id: string,
        @AuthJwtPayload('user', UserParsePipe) user: UserEntity
    ): Promise<IResponse<{ suggestionId: string }>> {
        const suggestion = await this.mergeSuggestionService.unmerge(
            id,
            workspace.id
        );
        await this.activityService.createByUserWithWorkspace(user, workspace, {
            action: ENUM_ACTIVITY_ACTION.CUSTOMER_UNMERGE,
            subject: ENUM_POLICY_SUBJECT.CUSTOMER,
            metadata: {
                id,
                suggestionId: suggestion.id,
            },
        });
        return { data: { suggestionId: suggestion.id } };
    }

    @CustomerWorkspaceEraseDoc()
    @Response('customer.workspace.erase')
    // CUSTOMER_DATA, not CUSTOMER: the Member role manages CUSTOMER, and
    // permanent erasure is for the workspace owner and admins. As a DELETE it
    // is also refused to an admin impersonating the user (read-only mode).
    @WorkspaceScopedProtected({
        subject: ENUM_POLICY_SUBJECT.CUSTOMER_DATA,
        action: [ENUM_POLICY_ACTION.DELETE],
    })
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Delete('/:id')
    async erase(
        @WorkspacePayload() workspace: WorkspaceEntity,
        @Param('id') id: string,
        @AuthJwtPayload('user', UserParsePipe) user: UserEntity
    ): Promise<IResponse<CustomerEraseResponseDto>> {
        // Permanent: the customer, merged profiles, contact points,
        // conversations, messages and stored media, plus the audit row, in
        // one transaction scoped to this workspace.
        const summary = await this.erasureService.erase(id, workspace, user);
        return { data: summary };
    }
}
