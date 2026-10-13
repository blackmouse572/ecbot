import { ENUM_ACTIVITY_ACTION } from '@app/modules/activity/enums/activity.enum';
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
import { CUSTOMER_TAG_PARAM } from '../constants/customer-tag.params.constant';
import {
    CustomerTagClientCreateDoc,
    CustomerTagClientDeleteDoc,
    CustomerTagClientListDoc,
    CustomerTagClientUpdateDoc,
} from '../docs/customer-tag.client.doc';
import { CustomerTagCreateRequestDto } from '../dtos/request/customer-tag.create.request.dto';
import { CustomerTagUpdateRequestDto } from '../dtos/request/customer-tag.update.request.dto';
import { CustomerTagGetResponseDto } from '../dtos/response/customer-tag.get.response.dto';
import { CustomerTagService } from '../services/customer-tag.service';

// 3rd-party surface: authenticated by x-api-key (ClientCredential), tenant
// derived from the credential (no :workspace param). See ADR-0012. Writes
// are logged as the credential's creator.
@ApiTags('modules.client.customerTag')
@Controller('/customer-tags')
export class CustomerTagClientController {
    constructor(
        private readonly customerTagService: CustomerTagService,
        private readonly activityService: ActivityService
    ) {}

    @CustomerTagClientListDoc()
    @Response('customerTag.workspace.list')
    @ClientCredentialProtected({
        subject: ENUM_POLICY_SUBJECT.CUSTOMER,
        action: [ENUM_POLICY_ACTION.READ],
    })
    @Get('/')
    async list(
        @WorkspacePayload() workspace: WorkspaceEntity
    ): Promise<IResponse<CustomerTagGetResponseDto[]>> {
        const tags = await this.customerTagService.findAllByWorkspace(
            workspace.id
        );
        return { data: this.customerTagService.mapList(tags) };
    }

    @CustomerTagClientCreateDoc()
    @Response('customerTag.workspace.create')
    @ClientCredentialProtected({
        subject: ENUM_POLICY_SUBJECT.CUSTOMER,
        action: [ENUM_POLICY_ACTION.CREATE],
    })
    @Post('/')
    async create(
        @WorkspacePayload() workspace: WorkspaceEntity,
        @ClientCredentialPayload() credential: ClientCredentialEntity,
        @Body() dto: CustomerTagCreateRequestDto
    ): Promise<IResponse<CustomerTagGetResponseDto>> {
        const tag = await this.customerTagService.create({
            workspace: workspace.id,
            name: dto.name,
            emoji: dto.emoji,
            description: dto.description,
            triggersHandoff: dto.triggersHandoff ?? false,
        });
        await this.log(ENUM_ACTIVITY_ACTION.CREATE, workspace, credential, tag);

        return { data: this.customerTagService.mapGet(tag) };
    }

    @CustomerTagClientUpdateDoc()
    @Response('customerTag.workspace.update')
    @ClientCredentialProtected({
        subject: ENUM_POLICY_SUBJECT.CUSTOMER,
        action: [ENUM_POLICY_ACTION.UPDATE],
    })
    @Patch(`/:${CUSTOMER_TAG_PARAM}`)
    async update(
        @WorkspacePayload() workspace: WorkspaceEntity,
        @ClientCredentialPayload() credential: ClientCredentialEntity,
        @Param(CUSTOMER_TAG_PARAM) id: string,
        @Body() dto: CustomerTagUpdateRequestDto
    ): Promise<IResponse<CustomerTagGetResponseDto>> {
        // 404s a tag outside the workspace.
        const tag = await this.customerTagService.update(id, dto, workspace.id);
        await this.log(ENUM_ACTIVITY_ACTION.UPDATE, workspace, credential, tag);

        return { data: this.customerTagService.mapGet(tag) };
    }

    @CustomerTagClientDeleteDoc()
    @Response('customerTag.workspace.delete')
    @ClientCredentialProtected({
        subject: ENUM_POLICY_SUBJECT.CUSTOMER,
        action: [ENUM_POLICY_ACTION.DELETE],
    })
    @HttpCode(HttpStatus.NO_CONTENT)
    @Delete(`/:${CUSTOMER_TAG_PARAM}`)
    async delete(
        @WorkspacePayload() workspace: WorkspaceEntity,
        @ClientCredentialPayload() credential: ClientCredentialEntity,
        @Param(CUSTOMER_TAG_PARAM) id: string
    ): Promise<void> {
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

        await this.customerTagService.delete(id, workspace.id);
        await this.log(ENUM_ACTIVITY_ACTION.DELETE, workspace, credential, tag);
    }

    private async log(
        action: ENUM_ACTIVITY_ACTION,
        workspace: WorkspaceEntity,
        credential: ClientCredentialEntity,
        tag: { id: string; name: string }
    ): Promise<void> {
        await this.activityService.createByUserWithWorkspace(
            credential.createdBy,
            workspace,
            {
                action,
                subject: ENUM_POLICY_SUBJECT.CUSTOMER,
                metadata: { id: tag.id, name: tag.name },
            }
        );
    }
}
