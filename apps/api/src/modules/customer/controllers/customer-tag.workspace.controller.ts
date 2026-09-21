import { IResponse } from '@app/common/response/interfaces/response.interface';
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
import { Response } from 'src/common/response/decorators/response.decorator';
import { CUSTOMER_TAG_PARAM } from '../constants/customer-tag.params.constant';
import {
    CustomerTagWorkspaceCreateDoc,
    CustomerTagWorkspaceDeleteDoc,
    CustomerTagWorkspaceGetDoc,
    CustomerTagWorkspaceListDoc,
    CustomerTagWorkspaceUpdateDoc,
} from '../docs/customer-tag.workspace.doc';
import { CustomerTagCreateRequestDto } from '../dtos/request/customer-tag.create.request.dto';
import { CustomerTagUpdateRequestDto } from '../dtos/request/customer-tag.update.request.dto';
import { CustomerTagGetResponseDto } from '../dtos/response/customer-tag.get.response.dto';
import { CustomerTagService } from '../services/customer-tag.service';

@ApiTags('modules.workspace.customerTag')
@Controller({
    version: '1',
    path: ':workspace/customer-tags',
})
export class CustomerTagWorkspaceController {
    constructor(
        private readonly customerTagService: CustomerTagService,
        private readonly activityService: ActivityService
    ) {}

    @CustomerTagWorkspaceListDoc()
    @Response('customerTag.workspace.list')
    @WorkspaceScopedProtected({
        subject: ENUM_POLICY_SUBJECT.CUSTOMER,
        action: [ENUM_POLICY_ACTION.READ],
    })
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Get('/')
    async list(
        @WorkspacePayload() workspace: WorkspaceEntity
    ): Promise<IResponse<CustomerTagGetResponseDto[]>> {
        const tags = await this.customerTagService.findAllByWorkspace(
            workspace.id
        );
        return { data: this.customerTagService.mapList(tags) };
    }

    @CustomerTagWorkspaceGetDoc()
    @Response('customerTag.workspace.get')
    @WorkspaceScopedProtected({
        subject: ENUM_POLICY_SUBJECT.CUSTOMER,
        action: [ENUM_POLICY_ACTION.READ],
    })
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Get(`/:${CUSTOMER_TAG_PARAM}`)
    async get(
        @WorkspacePayload() workspace: WorkspaceEntity,
        @Param(CUSTOMER_TAG_PARAM) id: string
    ): Promise<IResponse<CustomerTagGetResponseDto>> {
        // BOLA guard — never return a tag from a different workspace.
        const tag = await this.customerTagService.findOneInWorkspace(
            id,
            workspace.id
        );
        if (!tag) {
            throw new NotFoundException({
                message: 'customerTag.error.notFound',
                statusCode: 404,
            });
        }
        return { data: this.customerTagService.mapGet(tag) };
    }

    @CustomerTagWorkspaceCreateDoc()
    @Response('customerTag.workspace.create')
    @WorkspaceScopedProtected({
        subject: ENUM_POLICY_SUBJECT.CUSTOMER,
        action: [ENUM_POLICY_ACTION.CREATE],
    })
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Post('/')
    async create(
        @WorkspacePayload() workspace: WorkspaceEntity,
        @Body() dto: CustomerTagCreateRequestDto,
        @AuthJwtPayload('user', UserParsePipe) user: UserEntity
    ): Promise<IResponse<CustomerTagGetResponseDto>> {
        const tag = await this.customerTagService.create({
            workspace: workspace.id,
            name: dto.name,
            emoji: dto.emoji,
            description: dto.description,
            triggersHandoff: dto.triggersHandoff ?? false,
        });

        await this.activityService.createByUserWithWorkspace(user, workspace, {
            action: ENUM_ACTIVITY_ACTION.CREATE,
            subject: ENUM_POLICY_SUBJECT.CUSTOMER,
            metadata: {
                id: tag.id,
                name: tag.name,
            },
        });

        return { data: this.customerTagService.mapGet(tag) };
    }

    @CustomerTagWorkspaceUpdateDoc()
    @Response('customerTag.workspace.update')
    @WorkspaceScopedProtected({
        subject: ENUM_POLICY_SUBJECT.CUSTOMER,
        action: [ENUM_POLICY_ACTION.UPDATE],
    })
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Patch(`/:${CUSTOMER_TAG_PARAM}`)
    async update(
        @WorkspacePayload() workspace: WorkspaceEntity,
        @Param(CUSTOMER_TAG_PARAM) id: string,
        @Body() dto: CustomerTagUpdateRequestDto,
        @AuthJwtPayload('user', UserParsePipe) user: UserEntity
    ): Promise<IResponse<CustomerTagGetResponseDto>> {
        // BOLA guard — service throws 404 when the id resolves outside the
        // workspace.
        const updated = await this.customerTagService.update(
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

        return { data: this.customerTagService.mapGet(updated) };
    }

    @CustomerTagWorkspaceDeleteDoc()
    @Response('customerTag.workspace.delete')
    @WorkspaceScopedProtected({
        subject: ENUM_POLICY_SUBJECT.CUSTOMER,
        action: [ENUM_POLICY_ACTION.DELETE],
    })
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @HttpCode(HttpStatus.NO_CONTENT)
    @Delete(`/:${CUSTOMER_TAG_PARAM}`)
    async delete(
        @WorkspacePayload() workspace: WorkspaceEntity,
        @Param(CUSTOMER_TAG_PARAM) id: string,
        @AuthJwtPayload('user', UserParsePipe) user: UserEntity
    ): Promise<void> {
        const tag = await this.customerTagService.findOneInWorkspace(
            id,
            workspace.id
        );
        await this.customerTagService.delete(id, workspace.id);

        await this.activityService.createByUserWithWorkspace(user, workspace, {
            action: ENUM_ACTIVITY_ACTION.DELETE,
            subject: ENUM_POLICY_SUBJECT.CUSTOMER,
            metadata: {
                id,
                name: tag?.name || id,
            },
        });
    }
}
