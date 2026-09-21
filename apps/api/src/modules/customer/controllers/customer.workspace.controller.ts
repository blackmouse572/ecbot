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
import {
    CustomerWorkspaceGetDoc,
    CustomerWorkspaceUpdateDoc,
} from '../docs/customer.workspace.doc';
import { CustomerUpdateRequestDto } from '../dtos/request/customer.update.request.dto';
import { CustomerGetResponseDto } from '../dtos/response/customer.get.response.dto';
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
        private readonly activityService: ActivityService
    ) {}

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
        @Param('id') id: string
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
}
