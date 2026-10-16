import { ENUM_ACTIVITY_ACTION } from '@app/modules/activity/enums/activity.enum';
import { ENUM_CUSTOMER_TAG_EVENT_ACTOR } from '../enums/customer-tag.enum';
import { ActivityService } from '@app/modules/activity/services/activity.service';
import {
    ClientCredentialPayload,
    ClientCredentialProtected,
} from '@app/modules/client-credential/decorators/client-credential.decorator';
import { ClientCredentialEntity } from '@app/modules/client-credential/repository/entities/client-credential.entity';
import {
    ENUM_POLICY_ACTION,
    ENUM_POLICY_SUBJECT,
} from '@app/modules/policy/enums/policy.enum';
import { WorkspacePayload } from '@app/modules/workspace/decorators/workspace.decorator';
import { WorkspaceEntity } from '@app/modules/workspace/repository/entities/workspace.entity';
import { Response } from '@app/common/response/decorators/response.decorator';
import { IResponse } from '@app/common/response/interfaces/response.interface';
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
import {
    CustomerTagAssignmentClientApplyDoc,
    CustomerTagAssignmentClientListDoc,
    CustomerTagAssignmentClientRemoveDoc,
} from '../docs/customer-tag.client.doc';
import { CustomerTagAssignmentGetResponseDto } from '../dtos/response/customer-tag-assignment.get.response.dto';
import { CustomerTagAssignmentService } from '../services/customer-tag-assignment.service';

// 3rd-party surface: authenticated by x-api-key (ClientCredential), tenant
// derived from the credential (no :workspace param). See ADR-0012. The
// service checks that the customer and the tag are both in the workspace.
// Writes are logged as the credential's creator.
@ApiTags('modules.client.customerTagAssignment')
@Controller('/customers/:customerId/tags')
export class CustomerTagAssignmentClientController {
    constructor(
        private readonly customerTagAssignmentService: CustomerTagAssignmentService,
        private readonly activityService: ActivityService
    ) {}

    @CustomerTagAssignmentClientListDoc()
    @Response('customerTagAssignment.workspace.list')
    @ClientCredentialProtected({
        subject: ENUM_POLICY_SUBJECT.CUSTOMER,
        action: [ENUM_POLICY_ACTION.READ],
    })
    @Get('/')
    async list(
        @WorkspacePayload() workspace: WorkspaceEntity,
        @Param('customerId') customerId: string
    ): Promise<IResponse<CustomerTagAssignmentGetResponseDto[]>> {
        // [] when the customer is not in this workspace.
        const assignments =
            await this.customerTagAssignmentService.listByCustomer(
                customerId,
                workspace.id
            );
        return {
            data: this.customerTagAssignmentService.mapList(assignments),
        };
    }

    @CustomerTagAssignmentClientApplyDoc()
    @Response('customerTagAssignment.workspace.apply')
    @ClientCredentialProtected({
        subject: ENUM_POLICY_SUBJECT.CUSTOMER,
        action: [ENUM_POLICY_ACTION.UPDATE],
    })
    @Post('/:tagId')
    async apply(
        @WorkspacePayload() workspace: WorkspaceEntity,
        @ClientCredentialPayload() credential: ClientCredentialEntity,
        @Param('customerId') customerId: string,
        @Param('tagId') tagId: string
    ): Promise<IResponse<CustomerTagAssignmentGetResponseDto>> {
        const assignment = await this.customerTagAssignmentService.apply(
            customerId,
            tagId,
            workspace.id,
            {
                actor: ENUM_CUSTOMER_TAG_EVENT_ACTOR.CLIENT,
                userId: credential.createdBy?.id,
            }
        );
        await this.activityService.createByUserWithWorkspace(
            credential.createdBy,
            workspace,
            {
                action: ENUM_ACTIVITY_ACTION.CREATE,
                subject: ENUM_POLICY_SUBJECT.CUSTOMER,
                metadata: { id: assignment.id, name: tagId },
            }
        );

        return {
            data: this.customerTagAssignmentService.mapGet(assignment),
        };
    }

    @CustomerTagAssignmentClientRemoveDoc()
    @Response('customerTagAssignment.workspace.remove')
    @ClientCredentialProtected({
        subject: ENUM_POLICY_SUBJECT.CUSTOMER,
        action: [ENUM_POLICY_ACTION.UPDATE],
    })
    @HttpCode(HttpStatus.NO_CONTENT)
    @Delete('/:tagId')
    async remove(
        @WorkspacePayload() workspace: WorkspaceEntity,
        @ClientCredentialPayload() credential: ClientCredentialEntity,
        @Param('customerId') customerId: string,
        @Param('tagId') tagId: string
    ): Promise<void> {
        const tag = await this.customerTagAssignmentService.remove(
            customerId,
            tagId,
            workspace.id,
            {
                actor: ENUM_CUSTOMER_TAG_EVENT_ACTOR.CLIENT,
                userId: credential.createdBy?.id,
            }
        );
        await this.activityService.createByUserWithWorkspace(
            credential.createdBy,
            workspace,
            {
                action: ENUM_ACTIVITY_ACTION.DELETE,
                subject: ENUM_POLICY_SUBJECT.CUSTOMER,
                metadata: { id: tagId, name: tag?.name ?? tagId },
            }
        );
    }
}
