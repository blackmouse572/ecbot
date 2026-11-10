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
import { Body, Controller, Get, Param, Patch } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { PaginationQuery } from 'src/common/pagination/decorators/pagination.decorator';
import { PaginationListDto } from 'src/common/pagination/dtos/pagination.list.dto';
import { ENUM_PAGINATION_ORDER_DIRECTION_TYPE } from 'src/common/pagination/enums/pagination.enum';
import { PaginationService } from 'src/common/pagination/services/pagination.service';
import {
    Response,
    ResponsePaging,
} from 'src/common/response/decorators/response.decorator';
import {
    CustomerMarketingWorkspaceGetDoc,
    CustomerMarketingWorkspaceListEventsDoc,
    CustomerMarketingWorkspaceUpdateDoc,
} from '../docs/customer-marketing.workspace.doc';
import { CustomerMarketingStateUpdateRequestDto } from '../dtos/request/customer-marketing-state.update.request.dto';
import { CustomerMarketingStateGetResponseDto } from '../dtos/response/customer-marketing-state.get.response.dto';
import { MarketingEventGetResponseDto } from '../dtos/response/marketing-event.get.response.dto';
import { ENUM_MARKETING_EVENT_ACTOR } from '../enums/customer-marketing.enum';
import { ICustomerMarketingChangeContext } from '../interfaces/customer-marketing.interface';
import { CustomerMarketingService } from '../services/customer-marketing.service';

@ApiTags('modules.workspace.customerMarketing')
@Controller({
    version: '1',
    path: '/:workspace/customers/:id/marketing',
})
export class CustomerMarketingWorkspaceController {
    constructor(
        private readonly marketingService: CustomerMarketingService,
        private readonly activityService: ActivityService,
        private readonly paginationService: PaginationService
    ) {}

    @CustomerMarketingWorkspaceGetDoc()
    @Response('customerMarketing.workspace.get')
    @WorkspaceScopedProtected({
        subject: ENUM_POLICY_SUBJECT.CUSTOMER,
        action: [ENUM_POLICY_ACTION.READ],
    })
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Get('/')
    async get(
        @WorkspacePayload() workspace: WorkspaceEntity,
        @Param('id') id: string
    ): Promise<IResponse<CustomerMarketingStateGetResponseDto>> {
        const state = await this.marketingService.getState(id, workspace.id);
        return { data: this.marketingService.mapGet(state) };
    }

    @CustomerMarketingWorkspaceUpdateDoc()
    @Response('customerMarketing.workspace.update')
    @WorkspaceScopedProtected({
        subject: ENUM_POLICY_SUBJECT.CUSTOMER,
        action: [ENUM_POLICY_ACTION.UPDATE],
    })
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Patch('/')
    async update(
        @WorkspacePayload() workspace: WorkspaceEntity,
        @Param('id') id: string,
        @Body() dto: CustomerMarketingStateUpdateRequestDto,
        @AuthJwtPayload('user', UserParsePipe) user: UserEntity
    ): Promise<IResponse<CustomerMarketingStateGetResponseDto>> {
        const context: ICustomerMarketingChangeContext = {
            actor: ENUM_MARKETING_EVENT_ACTOR.OPERATOR,
            reason: dto.reason,
            userId: user.id,
        };
        // Hostile first: it stops offers, and a permission in the same
        // request then applies on top of it.
        if (dto.hostile !== undefined) {
            await this.marketingService.setHostile(
                id,
                workspace.id,
                dto.hostile,
                context
            );
        }
        if (dto.stage) {
            await this.marketingService.setStage(
                id,
                workspace.id,
                dto.stage,
                context
            );
        }
        if (dto.permission) {
            await this.marketingService.setPermission(
                id,
                workspace.id,
                dto.permission,
                context,
                dto.permissionUntil
            );
        }
        await this.activityService.createByUserWithWorkspace(user, workspace, {
            action: ENUM_ACTIVITY_ACTION.UPDATE,
            subject: ENUM_POLICY_SUBJECT.CUSTOMER,
            metadata: { id },
        });
        const state = await this.marketingService.getState(id, workspace.id);
        return { data: this.marketingService.mapGet(state) };
    }

    @CustomerMarketingWorkspaceListEventsDoc()
    @ResponsePaging('customerMarketing.workspace.listEvents')
    @WorkspaceScopedProtected({
        subject: ENUM_POLICY_SUBJECT.CUSTOMER,
        action: [ENUM_POLICY_ACTION.READ],
    })
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Get('/events')
    async listEvents(
        @WorkspacePayload() workspace: WorkspaceEntity,
        @Param('id') id: string,
        @PaginationQuery({
            defaultOrderBy: 'createdAt',
            defaultOrderDirection: ENUM_PAGINATION_ORDER_DIRECTION_TYPE.DESC,
        })
        { _limit, _offset, _order }: PaginationListDto
    ): Promise<IResponsePaging<MarketingEventGetResponseDto>> {
        const [events, total] = await this.marketingService.listEvents(
            id,
            workspace.id,
            {
                paging: { limit: _limit, offset: _offset },
                order: {
                    ..._order,
                    id: ENUM_PAGINATION_ORDER_DIRECTION_TYPE.DESC,
                },
            }
        );
        return {
            _pagination: {
                total,
                totalPage: this.paginationService.totalPage(total, _limit),
            },
            data: this.marketingService.mapEvents(events),
        };
    }
}
