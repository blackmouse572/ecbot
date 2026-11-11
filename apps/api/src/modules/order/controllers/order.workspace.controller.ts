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
import { ENUM_POLICY_SUBJECT } from '@app/modules/policy/enums/policy.enum';
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
import { ENUM_PAGINATION_ORDER_DIRECTION_TYPE } from 'src/common/pagination/enums/pagination.enum';
import { PaginationService } from 'src/common/pagination/services/pagination.service';
import {
    Response,
    ResponsePaging,
} from 'src/common/response/decorators/response.decorator';
import {
    ORDER_ABILITY_CREATE,
    ORDER_ABILITY_READ,
    ORDER_ABILITY_UPDATE,
} from '../constants/order.constant';
import { ORDER_PARAM } from '../constants/order.doc.constant';
import {
    ORDER_DEFAULT_AVAILABLE_ORDER_BY,
    ORDER_DEFAULT_AVAILABLE_SEARCH,
    ORDER_DEFAULT_SOURCE,
    ORDER_DEFAULT_STATUS,
} from '../constants/order.list.constant';
import {
    OrderWorkspaceCancelDoc,
    OrderWorkspaceConfirmDoc,
    OrderWorkspaceCreateDoc,
    OrderWorkspaceGetDoc,
    OrderWorkspaceImportDoc,
    OrderWorkspaceListDoc,
    OrderWorkspaceUpdateDoc,
} from '../docs/order.workspace.doc';
import { OrderImportRequestDto } from '../dtos/request/order-import.request.dto';
import { OrderCreateRequestDto } from '../dtos/request/order.create.request.dto';
import { OrderUpdateRequestDto } from '../dtos/request/order.update.request.dto';
import { OrderImportResponseDto } from '../dtos/response/order-import.response.dto';
import { OrderGetResponseDto } from '../dtos/response/order.get.response.dto';
import { ENUM_ORDER_SOURCE, ENUM_ORDER_STATUS } from '../enums/order.enum';
import { OrderEntity } from '../repository/entities/order.entity';
import { OrderImportService } from '../services/order-import.service';
import { OrderService } from '../services/order.service';

@ApiTags('modules.workspace.order')
@Controller({
    version: '1',
    path: '/:workspace/orders',
})
export class OrderWorkspaceController {
    constructor(
        private readonly orderService: OrderService,
        private readonly orderImportService: OrderImportService,
        private readonly paginationService: PaginationService,
        private readonly activityService: ActivityService
    ) {}

    @OrderWorkspaceListDoc()
    @ResponsePaging('order.workspace.list')
    @WorkspaceScopedProtected(ORDER_ABILITY_READ)
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Get('/')
    async list(
        @WorkspacePayload() workspace: WorkspaceEntity,
        @PaginationQuery({
            availableSearch: ORDER_DEFAULT_AVAILABLE_SEARCH,
            availableOrderBy: ORDER_DEFAULT_AVAILABLE_ORDER_BY,
            defaultOrderBy: 'orderedAt',
            defaultOrderDirection: ENUM_PAGINATION_ORDER_DIRECTION_TYPE.DESC,
        })
        { _search, _limit, _offset, _order }: PaginationListDto,
        @PaginationQueryFilterInEnum(
            'status',
            ORDER_DEFAULT_STATUS,
            ENUM_ORDER_STATUS
        )
        status: Record<string, any>,
        @PaginationQueryFilterInEnum(
            'source',
            ORDER_DEFAULT_SOURCE,
            ENUM_ORDER_SOURCE
        )
        source: Record<string, any>,
        @PaginationQueryFilterEqual('customer.id', { queryField: 'customer' })
        customer: Record<string, any>,
        @PaginationQueryFilterEqual('items.productGroup.id', {
            queryField: 'productGroup',
        })
        productGroup: Record<string, any>
    ): Promise<IResponsePaging<OrderGetResponseDto>> {
        const find: Record<string, any> = {
            ..._search,
            ...status,
            ...source,
            ...customer,
            ...productGroup,
        };
        const [orders, total] = await Promise.all([
            this.orderService.findAll(workspace.id, find, {
                paging: { limit: _limit, offset: _offset },
                order: {
                    ..._order,
                    id: ENUM_PAGINATION_ORDER_DIRECTION_TYPE.DESC,
                },
            }),
            this.orderService.getTotal(workspace.id, find),
        ]);
        return {
            _pagination: {
                total,
                totalPage: this.paginationService.totalPage(total, _limit),
            },
            data: this.orderService.mapList(orders),
        };
    }

    @OrderWorkspaceGetDoc()
    @Response('order.workspace.get')
    @WorkspaceScopedProtected(ORDER_ABILITY_READ)
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Get(`/:${ORDER_PARAM}`)
    async get(
        @WorkspacePayload() workspace: WorkspaceEntity,
        @Param(ORDER_PARAM) id: string
    ): Promise<IResponse<OrderGetResponseDto>> {
        const order = await this.orderService.findOneInWorkspaceOrFail(
            id,
            workspace.id
        );
        return { data: this.orderService.mapGet(order) };
    }

    @OrderWorkspaceCreateDoc()
    @Response('order.workspace.create')
    @WorkspaceScopedProtected(ORDER_ABILITY_CREATE)
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Post('/')
    async create(
        @WorkspacePayload() workspace: WorkspaceEntity,
        @Body() dto: OrderCreateRequestDto,
        @AuthJwtPayload('user', UserParsePipe) user: UserEntity
    ): Promise<IResponse<OrderGetResponseDto>> {
        const order = await this.orderService.create(workspace.id, {
            ...dto,
            // An operator adding an order by hand is the one confirming it.
            status: dto.status ?? ENUM_ORDER_STATUS.CONFIRMED,
            source: ENUM_ORDER_SOURCE.MANUAL,
            orderedAt: dto.orderedAt ? new Date(dto.orderedAt) : undefined,
        });
        await this.log(user, workspace, ENUM_ACTIVITY_ACTION.CREATE, order);
        return { data: this.orderService.mapGet(order) };
    }

    @OrderWorkspaceImportDoc()
    @Response('order.workspace.import')
    @WorkspaceScopedProtected(ORDER_ABILITY_CREATE)
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @HttpCode(HttpStatus.OK)
    @Post('/import')
    async import(
        @WorkspacePayload() workspace: WorkspaceEntity,
        @Body() dto: OrderImportRequestDto,
        @AuthJwtPayload('user', UserParsePipe) user: UserEntity
    ): Promise<IResponse<OrderImportResponseDto>> {
        const result = await this.orderImportService.import(
            workspace.id,
            dto.rows,
            dto.dryRun ?? false
        );
        if (!result.dryRun) {
            await this.activityService.createByUserWithWorkspace(
                user,
                workspace,
                {
                    action: ENUM_ACTIVITY_ACTION.CREATE,
                    subject: ENUM_POLICY_SUBJECT.ORDER,
                    metadata: {
                        imported: result.orders,
                        skipped: result.skipped,
                    },
                }
            );
        }
        return { data: result };
    }

    @OrderWorkspaceUpdateDoc()
    @Response('order.workspace.update')
    @WorkspaceScopedProtected(ORDER_ABILITY_UPDATE)
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Patch(`/:${ORDER_PARAM}`)
    async update(
        @WorkspacePayload() workspace: WorkspaceEntity,
        @Param(ORDER_PARAM) id: string,
        @Body() dto: OrderUpdateRequestDto,
        @AuthJwtPayload('user', UserParsePipe) user: UserEntity
    ): Promise<IResponse<OrderGetResponseDto>> {
        const order = await this.orderService.update(id, workspace.id, {
            ...dto,
            orderedAt: dto.orderedAt ? new Date(dto.orderedAt) : undefined,
        });
        await this.log(user, workspace, ENUM_ACTIVITY_ACTION.UPDATE, order);
        return { data: this.orderService.mapGet(order) };
    }

    @OrderWorkspaceConfirmDoc()
    @Response('order.workspace.confirm')
    @WorkspaceScopedProtected(ORDER_ABILITY_UPDATE)
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @HttpCode(HttpStatus.OK)
    @Post(`/:${ORDER_PARAM}/confirm`)
    async confirm(
        @WorkspacePayload() workspace: WorkspaceEntity,
        @Param(ORDER_PARAM) id: string,
        @AuthJwtPayload('user', UserParsePipe) user: UserEntity
    ): Promise<IResponse<OrderGetResponseDto>> {
        const order = await this.orderService.confirm(id, workspace.id);
        await this.log(user, workspace, ENUM_ACTIVITY_ACTION.UPDATE, order);
        return { data: this.orderService.mapGet(order) };
    }

    @OrderWorkspaceCancelDoc()
    @Response('order.workspace.cancel')
    @WorkspaceScopedProtected(ORDER_ABILITY_UPDATE)
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @HttpCode(HttpStatus.OK)
    @Post(`/:${ORDER_PARAM}/cancel`)
    async cancel(
        @WorkspacePayload() workspace: WorkspaceEntity,
        @Param(ORDER_PARAM) id: string,
        @AuthJwtPayload('user', UserParsePipe) user: UserEntity
    ): Promise<IResponse<OrderGetResponseDto>> {
        const order = await this.orderService.cancel(id, workspace.id);
        await this.log(user, workspace, ENUM_ACTIVITY_ACTION.UPDATE, order);
        return { data: this.orderService.mapGet(order) };
    }

    // The audit log is append-only, so it keeps ids and status, not names.
    private log(
        user: UserEntity,
        workspace: WorkspaceEntity,
        action: ENUM_ACTIVITY_ACTION,
        order: OrderEntity
    ) {
        return this.activityService.createByUserWithWorkspace(user, workspace, {
            action,
            subject: ENUM_POLICY_SUBJECT.ORDER,
            metadata: { id: order.id, status: order.status },
        });
    }
}
