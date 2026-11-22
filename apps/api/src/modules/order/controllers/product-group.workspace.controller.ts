import { FeatureFlagProtected } from '@app/modules/feature-flag/decorators/feature-flag.decorator';
import { ENUM_FEATURE_FLAG } from '@app/modules/feature-flag/enums/feature-flag.enum';
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
    DefaultValuePipe,
    Delete,
    ForbiddenException,
    Get,
    HttpCode,
    HttpStatus,
    Param,
    ParseBoolPipe,
    Patch,
    Post,
    Put,
    Query,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AwsS3PresignResponseDto } from 'src/modules/aws/dtos/response/aws.s3-presign.response.dto';
import { AwsS3Service } from 'src/modules/aws/services/aws.s3.service';
import { PaginationQuery } from 'src/common/pagination/decorators/pagination.decorator';
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
    PRODUCT_GROUP_ABILITY_DELETE,
    PRODUCT_GROUP_ABILITY_UPDATE,
} from '../constants/order.constant';
import { PRODUCT_GROUP_PARAM } from '../constants/order.doc.constant';
import {
    PRODUCT_GROUP_DEFAULT_AVAILABLE_ORDER_BY,
    PRODUCT_GROUP_DEFAULT_AVAILABLE_SEARCH,
} from '../constants/order.list.constant';
import {
    ProductGroupWorkspaceCreateDoc,
    ProductGroupWorkspaceDeleteDoc,
    ProductGroupWorkspaceDeleteImageDoc,
    ProductGroupWorkspaceListDoc,
    ProductGroupWorkspaceUpdateDoc,
    ProductGroupWorkspaceUpdateImageDoc,
    ProductGroupWorkspaceUploadImageDoc,
} from '../docs/product-group.workspace.doc';
import { ProductGroupCreateRequestDto } from '../dtos/request/product-group.create.request.dto';
import { ProductGroupUpdateRequestDto } from '../dtos/request/product-group.update.request.dto';
import { ProductGroupUpdateImageRequestDto } from '../dtos/request/product-group.update-image.request.dto';
import { ProductGroupUploadImageRequestDto } from '../dtos/request/product-group.upload-image.request.dto';
import { ProductGroupGetResponseDto } from '../dtos/response/product-group.get.response.dto';
import { ProductGroupEntity } from '../repository/entities/product-group.entity';
import { ProductGroupService } from '../services/product-group.service';

@ApiTags('modules.workspace.productGroup')
@FeatureFlagProtected(ENUM_FEATURE_FLAG.ORDERS)
@Controller({
    version: '1',
    path: '/:workspace/product-groups',
})
export class ProductGroupWorkspaceController {
    constructor(
        private readonly productGroupService: ProductGroupService,
        private readonly paginationService: PaginationService,
        private readonly activityService: ActivityService,
        private readonly awsS3Service: AwsS3Service
    ) {}

    @ProductGroupWorkspaceListDoc()
    @ResponsePaging('order.productGroup.workspace.list')
    @WorkspaceScopedProtected(ORDER_ABILITY_READ)
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
        { _search, _limit, _offset, _order }: PaginationListDto,
        @Query('withStats', new DefaultValuePipe(false), ParseBoolPipe)
        withStats: boolean
    ): Promise<IResponsePaging<ProductGroupGetResponseDto>> {
        const find: Record<string, any> = { ..._search };
        const [groups, total] = await Promise.all([
            this.productGroupService.findAll(workspace.id, find, {
                paging: { limit: _limit, offset: _offset },
                order: _order,
            }),
            this.productGroupService.getTotal(workspace.id, find),
        ]);
        // Only the Nhóm hàng tab asks: the order form selects list plainly.
        const stats = withStats
            ? await this.productGroupService.statsOf(
                  groups.map(group => group.id)
              )
            : undefined;
        return {
            _pagination: {
                total,
                totalPage: this.paginationService.totalPage(total, _limit),
            },
            data: this.productGroupService.mapList(groups, stats),
        };
    }

    @ProductGroupWorkspaceCreateDoc()
    @Response('order.productGroup.workspace.create')
    @WorkspaceScopedProtected(ORDER_ABILITY_CREATE)
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
    @WorkspaceScopedProtected(PRODUCT_GROUP_ABILITY_UPDATE)
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
    @WorkspaceScopedProtected(PRODUCT_GROUP_ABILITY_DELETE)
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

    @ProductGroupWorkspaceUploadImageDoc()
    @Response('order.productGroup.workspace.uploadImage')
    @WorkspaceScopedProtected(PRODUCT_GROUP_ABILITY_UPDATE)
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @HttpCode(HttpStatus.OK)
    @Post(`/:${PRODUCT_GROUP_PARAM}/image/upload`)
    async uploadImage(
        @WorkspacePayload() workspace: WorkspaceEntity,
        @Param(PRODUCT_GROUP_PARAM) id: string,
        @Body() { mime, size }: ProductGroupUploadImageRequestDto
    ): Promise<IResponse<AwsS3PresignResponseDto>> {
        const group = await this.productGroupService.findOneInWorkspaceOrFail(
            id,
            workspace.id
        );
        const key = this.productGroupService.newImageKey(group, mime);
        return { data: await this.awsS3Service.presignPutItem(key, size) };
    }

    @ProductGroupWorkspaceUpdateImageDoc()
    @Response('order.productGroup.workspace.updateImage')
    @WorkspaceScopedProtected(PRODUCT_GROUP_ABILITY_UPDATE)
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Put(`/:${PRODUCT_GROUP_PARAM}/image`)
    async updateImage(
        @WorkspacePayload() workspace: WorkspaceEntity,
        @Param(PRODUCT_GROUP_PARAM) id: string,
        @Body() body: ProductGroupUpdateImageRequestDto,
        @AuthJwtPayload('user', UserParsePipe) user: UserEntity
    ): Promise<IResponse<ProductGroupGetResponseDto>> {
        const group = await this.productGroupService.findOneInWorkspaceOrFail(
            id,
            workspace.id
        );
        // Only a key the upload step issued for this group: any other key
        // would attach someone else's file.
        if (
            !body.key.startsWith(this.productGroupService.imageKeyPrefix(group))
        ) {
            throw new ForbiddenException({
                statusCode: 403,
                message: 'order.productGroup.error.imageKeyInvalid',
            });
        }
        const saved = await this.productGroupService.setImage(
            group,
            this.awsS3Service.mapPresign(body)
        );
        await this.log(user, workspace, ENUM_ACTIVITY_ACTION.UPDATE, saved);
        return { data: this.productGroupService.mapGet(saved) };
    }

    @ProductGroupWorkspaceDeleteImageDoc()
    @Response('order.productGroup.workspace.deleteImage')
    @WorkspaceScopedProtected(PRODUCT_GROUP_ABILITY_UPDATE)
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Delete(`/:${PRODUCT_GROUP_PARAM}/image`)
    async deleteImage(
        @WorkspacePayload() workspace: WorkspaceEntity,
        @Param(PRODUCT_GROUP_PARAM) id: string,
        @AuthJwtPayload('user', UserParsePipe) user: UserEntity
    ): Promise<IResponse<ProductGroupGetResponseDto>> {
        const group = await this.productGroupService.findOneInWorkspaceOrFail(
            id,
            workspace.id
        );
        const saved = await this.productGroupService.setImage(group, null);
        await this.log(user, workspace, ENUM_ACTIVITY_ACTION.UPDATE, saved);
        return { data: this.productGroupService.mapGet(saved) };
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
