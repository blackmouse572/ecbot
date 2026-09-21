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
    DefaultValuePipe,
    Get,
    HttpCode,
    HttpStatus,
    Param,
    ParseEnumPipe,
    ParseIntPipe,
    Post,
    Query,
} from '@nestjs/common';
import { ApiQuery, ApiTags } from '@nestjs/swagger';
import { plainToInstance } from 'class-transformer';
import { Response } from 'src/common/response/decorators/response.decorator';
import { CustomerMergeSuggestionConfirmRequestDto } from '../dtos/request/customer-merge-suggestion.confirm.request.dto';
import { CustomerMergeSuggestionGetResponseDto } from '../dtos/response/customer-merge-suggestion.get.response.dto';
import { ENUM_CUSTOMER_MERGE_SUGGESTION_STATUS } from '../enums/customer.enum';
import { CustomerMergeSuggestionService } from '../services/customer-merge-suggestion.service';

@ApiTags('modules.workspace.customerMergeSuggestion')
@Controller({
    version: '1',
    path: '/:workspace/customer-merge-suggestions',
})
export class CustomerMergeSuggestionWorkspaceController {
    constructor(
        private readonly suggestionService: CustomerMergeSuggestionService,
        private readonly activityService: ActivityService
    ) {}

    @Response('customerMergeSuggestion.workspace.list')
    @WorkspaceScopedProtected({
        subject: ENUM_POLICY_SUBJECT.CUSTOMER,
        action: [ENUM_POLICY_ACTION.READ],
    })
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @ApiQuery({
        name: 'status',
        required: false,
        enum: ENUM_CUSTOMER_MERGE_SUGGESTION_STATUS,
    })
    @ApiQuery({ name: 'page', required: false, type: Number })
    @ApiQuery({ name: 'perPage', required: false, type: Number })
    @Get('/')
    async list(
        @WorkspacePayload() workspace: WorkspaceEntity,
        // Annotated `string`, not the enum: `design:paramtypes` emits the enum
        // object for an enum-typed param, and the global ValidationPipe
        // (forbidUnknownValues) rejects it as an unknown value — 422 on every
        // request. ParseEnumPipe does the runtime check instead.
        @Query(
            'status',
            new ParseEnumPipe(ENUM_CUSTOMER_MERGE_SUGGESTION_STATUS, {
                optional: true,
            })
        )
        status?: string,
        @Query('page', new DefaultValuePipe(1), ParseIntPipe) page = 1,
        @Query('perPage', new DefaultValuePipe(20), ParseIntPipe) perPage = 20
    ): Promise<
        IResponse<{
            data: CustomerMergeSuggestionGetResponseDto[];
            page: number;
            perPage: number;
            totalData: number;
        }>
    > {
        const result = await this.suggestionService.listByWorkspace(
            workspace.id,
            {
                status: status as ENUM_CUSTOMER_MERGE_SUGGESTION_STATUS,
                page,
                perPage,
            }
        );
        return {
            data: {
                data: result.data.map(s =>
                    plainToInstance(CustomerMergeSuggestionGetResponseDto, s, {
                        excludeExtraneousValues: true,
                    })
                ),
                page: result.page,
                perPage: result.perPage,
                totalData: result.totalData,
            },
        };
    }

    @Response('customerMergeSuggestion.workspace.pendingCustomerIds')
    @WorkspaceScopedProtected({
        subject: ENUM_POLICY_SUBJECT.CUSTOMER,
        action: [ENUM_POLICY_ACTION.READ],
    })
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Get('/pending-customer-ids')
    async pendingCustomerIds(
        @WorkspacePayload() workspace: WorkspaceEntity
    ): Promise<IResponse<{ customerIds: string[] }>> {
        const ids =
            await this.suggestionService.findPendingCustomerIdsByWorkspace(
                workspace.id
            );
        return { data: { customerIds: ids } };
    }

    @Response('customerMergeSuggestion.workspace.get')
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
    ): Promise<IResponse<CustomerMergeSuggestionGetResponseDto>> {
        const suggestion = await this.suggestionService.findOne(
            id,
            workspace.id
        );
        return {
            data: plainToInstance(
                CustomerMergeSuggestionGetResponseDto,
                suggestion,
                { excludeExtraneousValues: true }
            ),
        };
    }

    @Response('customerMergeSuggestion.workspace.confirm')
    @WorkspaceScopedProtected({
        subject: ENUM_POLICY_SUBJECT.CUSTOMER,
        action: [ENUM_POLICY_ACTION.UPDATE],
    })
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @HttpCode(HttpStatus.OK)
    @Post('/:id/confirm')
    async confirm(
        @WorkspacePayload() workspace: WorkspaceEntity,
        @Param('id') id: string,
        @Body() dto: CustomerMergeSuggestionConfirmRequestDto,
        @AuthJwtPayload('user', UserParsePipe) user: UserEntity
    ): Promise<IResponse<{ survivorId: string; loserId: string }>> {
        const result = await this.suggestionService.confirmMerge(
            id,
            workspace.id,
            {
                survivorId: dto.survivorId,
                fieldResolutions: dto.fieldResolutions,
            }
        );

        await this.activityService.createByUserWithWorkspace(user, workspace, {
            action: ENUM_ACTIVITY_ACTION.CUSTOMER_MERGE_CONFIRM,
            subject: ENUM_POLICY_SUBJECT.CUSTOMER,
            metadata: {
                id,
                survivorId: result.survivorId,
                loserId: result.loserId,
            },
        });

        return { data: result };
    }

    @Response('customerMergeSuggestion.workspace.dismiss')
    @WorkspaceScopedProtected({
        subject: ENUM_POLICY_SUBJECT.CUSTOMER,
        action: [ENUM_POLICY_ACTION.UPDATE],
    })
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @HttpCode(HttpStatus.OK)
    @Post('/:id/dismiss')
    async dismiss(
        @WorkspacePayload() workspace: WorkspaceEntity,
        @Param('id') id: string,
        @AuthJwtPayload('user', UserParsePipe) user: UserEntity
    ): Promise<IResponse<CustomerMergeSuggestionGetResponseDto>> {
        const suggestion = await this.suggestionService.dismiss(
            id,
            workspace.id
        );

        await this.activityService.createByUserWithWorkspace(user, workspace, {
            action: ENUM_ACTIVITY_ACTION.CUSTOMER_MERGE_DISMISS,
            subject: ENUM_POLICY_SUBJECT.CUSTOMER,
            metadata: {
                id,
                name: suggestion.id,
            },
        });

        return {
            data: plainToInstance(
                CustomerMergeSuggestionGetResponseDto,
                suggestion,
                { excludeExtraneousValues: true }
            ),
        };
    }
}
