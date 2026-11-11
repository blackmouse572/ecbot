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
    BadRequestException,
    Body,
    Controller,
    Delete,
    HttpCode,
    HttpStatus,
    Param,
    ParseUUIDPipe,
    Put,
    Query,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Response } from 'src/common/response/decorators/response.decorator';
import {
    CustomerProductReactionWorkspaceDeleteDoc,
    CustomerProductReactionWorkspaceUpdateDoc,
} from '../docs/customer-product-reaction.workspace.doc';
import { CustomerProductReactionUpdateRequestDto } from '../dtos/request/customer-product-reaction.update.request.dto';
import { CustomerProductReactionGetResponseDto } from '../dtos/response/customer-product-reaction.get.response.dto';
import { ENUM_MARKETING_EVENT_ACTOR } from '../enums/customer-marketing.enum';
import { CustomerProductMarketingService } from '../services/customer-product-marketing.service';

/** An operator's "Tạm hoãn <product group>" on a customer. */
@ApiTags('modules.workspace.customerMarketing')
@Controller({
    version: '1',
    path: '/:workspace/customers/:id/marketing/reactions',
})
export class CustomerProductReactionWorkspaceController {
    constructor(
        private readonly productMarketingService: CustomerProductMarketingService,
        private readonly activityService: ActivityService
    ) {}

    @CustomerProductReactionWorkspaceUpdateDoc()
    @Response('customerMarketing.reaction.update')
    @WorkspaceScopedProtected({
        subject: ENUM_POLICY_SUBJECT.CUSTOMER,
        action: [ENUM_POLICY_ACTION.UPDATE],
    })
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Put('/:productGroupId')
    async update(
        @WorkspacePayload() workspace: WorkspaceEntity,
        @Param('id') id: string,
        @Param('productGroupId', ParseUUIDPipe) productGroupId: string,
        @Body() dto: CustomerProductReactionUpdateRequestDto,
        @AuthJwtPayload('user', UserParsePipe) user: UserEntity
    ): Promise<IResponse<CustomerProductReactionGetResponseDto>> {
        if (dto.until.getTime() <= Date.now()) {
            throw new BadRequestException({
                statusCode: 400,
                message: 'customerMarketing.error.deferNeedsDate',
            });
        }
        await this.productMarketingService.deferProductGroup(
            id,
            workspace.id,
            productGroupId,
            dto.until,
            {
                actor: ENUM_MARKETING_EVENT_ACTOR.OPERATOR,
                reason: dto.reason,
                userId: user.id,
            }
        );
        await this.activityService.createByUserWithWorkspace(user, workspace, {
            action: ENUM_ACTIVITY_ACTION.UPDATE,
            subject: ENUM_POLICY_SUBJECT.CUSTOMER,
            metadata: { id, productGroupId },
        });
        const reaction = await this.productMarketingService.findReaction(
            id,
            productGroupId
        );
        return { data: this.productMarketingService.mapReaction(reaction!) };
    }

    @CustomerProductReactionWorkspaceDeleteDoc()
    @Response('customerMarketing.reaction.delete')
    @WorkspaceScopedProtected({
        subject: ENUM_POLICY_SUBJECT.CUSTOMER,
        action: [ENUM_POLICY_ACTION.UPDATE],
    })
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @HttpCode(HttpStatus.NO_CONTENT)
    @Delete('/:productGroupId')
    async remove(
        @WorkspacePayload() workspace: WorkspaceEntity,
        @Param('id') id: string,
        @Param('productGroupId', ParseUUIDPipe) productGroupId: string,
        @AuthJwtPayload('user', UserParsePipe) user: UserEntity,
        @Query('reason') reason?: string
    ): Promise<void> {
        await this.productMarketingService.clearProductGroup(
            id,
            workspace.id,
            productGroupId,
            {
                actor: ENUM_MARKETING_EVENT_ACTOR.OPERATOR,
                reason: reason?.trim().slice(0, 500) || undefined,
                userId: user.id,
            }
        );
        await this.activityService.createByUserWithWorkspace(user, workspace, {
            action: ENUM_ACTIVITY_ACTION.UPDATE,
            subject: ENUM_POLICY_SUBJECT.CUSTOMER,
            metadata: { id, productGroupId },
        });
    }
}
