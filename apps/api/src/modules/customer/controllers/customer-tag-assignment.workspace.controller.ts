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
    Controller,
    Delete,
    Get,
    HttpCode,
    HttpStatus,
    Param,
    Post,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Response } from 'src/common/response/decorators/response.decorator';
import {
    CustomerTagAssignmentWorkspaceApplyDoc,
    CustomerTagAssignmentWorkspaceListDoc,
    CustomerTagAssignmentWorkspaceRemoveDoc,
} from '../docs/customer-tag.workspace.doc';
import { CustomerTagAssignmentGetResponseDto } from '../dtos/response/customer-tag-assignment.get.response.dto';
import { CustomerTagAssignmentService } from '../services/customer-tag-assignment.service';

@ApiTags('modules.workspace.customerTagAssignment')
@Controller({
    version: '1',
    path: '/:workspace/customers/:customerId/tags',
})
export class CustomerTagAssignmentWorkspaceController {
    constructor(
        private readonly customerTagAssignmentService: CustomerTagAssignmentService,
        private readonly activityService: ActivityService
    ) {}

    @CustomerTagAssignmentWorkspaceListDoc()
    @Response('customerTagAssignment.workspace.list')
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
        @Param('customerId') customerId: string
    ): Promise<IResponse<CustomerTagAssignmentGetResponseDto[]>> {
        // BOLA — listByCustomer returns [] when the customer is not in this
        // workspace.
        const assignments =
            await this.customerTagAssignmentService.listByCustomer(
                customerId,
                workspace.id
            );
        return {
            data: this.customerTagAssignmentService.mapList(assignments),
        };
    }

    @CustomerTagAssignmentWorkspaceApplyDoc()
    @Response('customerTagAssignment.workspace.apply')
    @WorkspaceScopedProtected({
        subject: ENUM_POLICY_SUBJECT.CUSTOMER,
        action: [ENUM_POLICY_ACTION.UPDATE],
    })
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Post('/:tagId')
    async apply(
        @WorkspacePayload() workspace: WorkspaceEntity,
        @Param('customerId') customerId: string,
        @Param('tagId') tagId: string,
        @AuthJwtPayload('user', UserParsePipe) user: UserEntity
    ): Promise<IResponse<CustomerTagAssignmentGetResponseDto>> {
        // BOLA — both ids must resolve inside the workspace.
        const assignment = await this.customerTagAssignmentService.apply(
            customerId,
            tagId,
            workspace.id
        );

        await this.activityService.createByUserWithWorkspace(user, workspace, {
            action: ENUM_ACTIVITY_ACTION.CREATE,
            subject: ENUM_POLICY_SUBJECT.CUSTOMER,
            metadata: {
                id: assignment.id,
                name: tagId,
            },
        });

        return {
            data: this.customerTagAssignmentService.mapGet(assignment),
        };
    }

    @CustomerTagAssignmentWorkspaceRemoveDoc()
    @Response('customerTagAssignment.workspace.remove')
    @WorkspaceScopedProtected({
        subject: ENUM_POLICY_SUBJECT.CUSTOMER,
        action: [ENUM_POLICY_ACTION.UPDATE],
    })
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @HttpCode(HttpStatus.NO_CONTENT)
    @Delete('/:tagId')
    async remove(
        @WorkspacePayload() workspace: WorkspaceEntity,
        @Param('customerId') customerId: string,
        @Param('tagId') tagId: string,
        @AuthJwtPayload('user', UserParsePipe) user: UserEntity
    ): Promise<void> {
        const tag = await this.customerTagAssignmentService.remove(
            customerId,
            tagId,
            workspace.id
        );

        await this.activityService.createByUserWithWorkspace(user, workspace, {
            action: ENUM_ACTIVITY_ACTION.DELETE,
            subject: ENUM_POLICY_SUBJECT.CUSTOMER,
            metadata: {
                id: tagId,
                name: tag?.name ?? tagId,
            },
        });
    }
}
