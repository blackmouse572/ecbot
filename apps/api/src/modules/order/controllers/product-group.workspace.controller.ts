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
    Param,
    Patch,
    Post,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { PaginationQuery } from 'src/common/pagination/decorators/pagination.decorator';
import { PaginationListDto } from 'src/common/pagination/dtos/pagination.list.dto';
import { ENUM_PAGINATION_ORDER_DIRECTION_TYPE } from 'src/common/pagination/enums/pagination.enum';
import { PaginationService } from 'src/common/pagination/services/pagination.service';
import {
    Response,
    ResponsePaging,
} from 'src/common/response/decorators/response.decorator';
import { PRODUCT_GROUP_PARAM } from '../constants/order.doc.constant';
import {
    PRODUCT_GROUP_DEFAULT_AVAILABLE_ORDER_BY,
    PRODUCT_GROUP_DEFAULT_AVAILABLE_SEARCH,
} from '../constants/order.list.constant';
import {
    ProductGroupWorkspaceCreateDoc,
    ProductGroupWorkspaceDeleteDoc,
    ProductGroupWorkspaceListDoc,
    ProductGroupWorkspaceUpdateDoc,
} from '../docs/product-group.workspace.doc';
import { ProductGroupCreateRequestDto } from '../dtos/request/product-group.create.request.dto';
import { ProductGroupUpdateRequestDto } from '../dtos/request/product-group.update.request.dto';
import { ProductGroupGetResponseDto } from '../dtos/response/product-group.get.response.dto';
import { ProductGroupEntity } from '../repository/entities/product-group.entity';
import { ProductGroupService } from '../services/product-group.service';

// Product groups belong with orders, which share the CUSTOMER permission.
const READ = {
    subject: ENUM_POLICY_SUBJECT.CUSTOMER,
    action: [ENUM_POLICY_ACTION.READ],
};
const WRITE = {
    subject: ENUM_POLICY_SUBJECT.CUSTOMER,
    action: [ENUM_POLICY_ACTION.UPDATE],
};

@ApiTags('modules.workspace.productGroup')
@Controller({
    version: '1',
    path: '/:workspace/product-groups',
})
export class ProductGroupWorkspaceController {
    constructor(
        private readonly productGroupService: ProductGroupService,
        private readonly paginationService: PaginationService,
        private readonly activityService: ActivityService
    ) {}

    @ProductGroupWorkspaceListDoc()
    @ResponsePaging('order.productGroup.workspace.list')
    @WorkspaceScopedProtected(READ)
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Get('/')
    async list(
        @WorkspacePayload() workspace: WorkspaceEntity,
        @PaginationQuery({
            availableSearch: PRODUCT_GROUP_DEFAULT_AVAILABLE_SEARCH,
            availableOrderBy: PRODUCT_GROUP_DEFAULT_AVAILABLE_ORDER_BY,
            defaultOrderBy: 'name',
            defaultOrderDirection: ENUM_PAGINATION_ORDER_DIRECTION_TYPE.ASC,
        })
        { _search, _limit, _offset, _order }: PaginationListDto
    ): Promise<IResponsePaging<ProductGroupGetResponseDto>> {
        const find: Record<string, any> = { ..._search };
        const [groups, total] = await Promise.all([
            this.productGroupService.findAll(workspace.id, find, {
                paging: { limit: _limit, offset: _offset },
                order: _order,
            }),
            this.productGroupService.getTotal(workspace.id, find),
        ]);
        return {
            _pagination: {
                total,
                totalPage: this.paginationService.totalPage(total, _limit),
            },
            data: this.productGroupService.mapList(groups),
        };
    }

    @ProductGroupWorkspaceCreateDoc()
    @Response('order.productGroup.workspace.create')
    @WorkspaceScopedProtected(WRITE)
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Post('/')
    async create(
        @WorkspacePayload() workspace: WorkspaceEntity,
        @Body() dto: ProductGroupCreateRequestDto,
        @AuthJwtPayload('user', UserParsePipe) user: UserEntity
    ): Promise<IResponse<ProductGroupGetResponseDto>> {
        const group = await this.productGroupService.create(workspace.id, dto);
        await this.log(user, workspace, ENUM_ACTIVITY_ACTION.CREATE, group);
        return { data: this.productGroupService.mapGet(group) };
    }

    @ProductGroupWorkspaceUpdateDoc()
    @Response('order.productGroup.workspace.update')
    @WorkspaceScopedProtected(WRITE)
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Patch(`/:${PRODUCT_GROUP_PARAM}`)
    async update(
        @WorkspacePayload() workspace: WorkspaceEntity,
        @Param(PRODUCT_GROUP_PARAM) id: string,
        @Body() dto: ProductGroupUpdateRequestDto,
        @AuthJwtPayload('user', UserParsePipe) user: UserEntity
    ): Promise<IResponse<ProductGroupGetResponseDto>> {
        const group = await this.productGroupService.update(
            id,
            workspace.id,
            dto
        );
        await this.log(user, workspace, ENUM_ACTIVITY_ACTION.UPDATE, group);
        return { data: this.productGroupService.mapGet(group) };
    }

    @ProductGroupWorkspaceDeleteDoc()
    @Response('order.productGroup.workspace.delete')
    @WorkspaceScopedProtected(WRITE)
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @HttpCode(HttpStatus.NO_CONTENT)
    @Delete(`/:${PRODUCT_GROUP_PARAM}`)
    async delete(
        @WorkspacePayload() workspace: WorkspaceEntity,
        @Param(PRODUCT_GROUP_PARAM) id: string,
        @AuthJwtPayload('user', UserParsePipe) user: UserEntity
    ): Promise<void> {
        const group = await this.productGroupService.delete(id, workspace.id);
        await this.log(user, workspace, ENUM_ACTIVITY_ACTION.DELETE, group);
    }

    private log(
        user: UserEntity,
        workspace: WorkspaceEntity,
        action: ENUM_ACTIVITY_ACTION,
        group: ProductGroupEntity
    ) {
        return this.activityService.createByUserWithWorkspace(user, workspace, {
            action,
            subject: ENUM_POLICY_SUBJECT.ORDER,
            metadata: { id: group.id, name: group.name },
        });
    }
}
