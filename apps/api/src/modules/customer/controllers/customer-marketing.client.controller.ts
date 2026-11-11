import { PaginationQuery } from '@app/common/pagination/decorators/pagination.decorator';
import { PaginationListDto } from '@app/common/pagination/dtos/pagination.list.dto';
import { ENUM_PAGINATION_ORDER_DIRECTION_TYPE } from '@app/common/pagination/enums/pagination.enum';
import { PaginationService } from '@app/common/pagination/services/pagination.service';
import {
    Response,
    ResponsePaging,
} from '@app/common/response/decorators/response.decorator';
import {
    IResponse,
    IResponsePaging,
} from '@app/common/response/interfaces/response.interface';
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
import { Body, Controller, Get, Param, Patch } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import {
    CustomerMarketingClientGetDoc,
    CustomerMarketingClientListEventsDoc,
    CustomerMarketingClientUpdateDoc,
} from '../docs/customer-marketing.client.doc';
import { CustomerMarketingStateUpdateRequestDto } from '../dtos/request/customer-marketing-state.update.request.dto';
import { CustomerMarketingStateGetResponseDto } from '../dtos/response/customer-marketing-state.get.response.dto';
import { MarketingEventGetResponseDto } from '../dtos/response/marketing-event.get.response.dto';
import { ENUM_MARKETING_EVENT_ACTOR } from '../enums/customer-marketing.enum';
import { CustomerMarketingService } from '../services/customer-marketing.service';

// 3rd-party surface (MCP): the workspace comes from the credential, and an
// edit is recorded as CLIENT, made by the credential's creator.
@ApiTags('modules.client.customerMarketing')
@Controller('/customers/:id/marketing')
export class CustomerMarketingClientController {
    constructor(
        private readonly marketingService: CustomerMarketingService,
        private readonly activityService: ActivityService,
        private readonly paginationService: PaginationService
    ) {}

    @CustomerMarketingClientGetDoc()
    @Response('customerMarketing.workspace.get')
    @ClientCredentialProtected({
        subject: ENUM_POLICY_SUBJECT.CUSTOMER,
        action: [ENUM_POLICY_ACTION.READ],
    })
    @Get('/')
    async get(
        @WorkspacePayload() workspace: WorkspaceEntity,
        @Param('id') id: string
    ): Promise<IResponse<CustomerMarketingStateGetResponseDto>> {
        return {
            data: await this.marketingService.getDetail(id, workspace.id),
        };
    }

    @CustomerMarketingClientUpdateDoc()
    @Response('customerMarketing.workspace.update')
    @ClientCredentialProtected({
        subject: ENUM_POLICY_SUBJECT.CUSTOMER,
        action: [ENUM_POLICY_ACTION.UPDATE],
    })
    @Patch('/')
    async update(
        @WorkspacePayload() workspace: WorkspaceEntity,
        @ClientCredentialPayload() credential: ClientCredentialEntity,
        @Param('id') id: string,
        @Body() dto: CustomerMarketingStateUpdateRequestDto
    ): Promise<IResponse<CustomerMarketingStateGetResponseDto>> {
        await this.marketingService.applyChange(id, workspace.id, dto, {
            actor: ENUM_MARKETING_EVENT_ACTOR.CLIENT,
            reason: dto.reason,
            userId: credential.createdBy.id,
        });
        await this.activityService.createByUserWithWorkspace(
            credential.createdBy,
            workspace,
            {
                action: ENUM_ACTIVITY_ACTION.UPDATE,
                subject: ENUM_POLICY_SUBJECT.CUSTOMER,
                metadata: { id },
            }
        );
        return {
            data: await this.marketingService.getDetail(id, workspace.id),
        };
    }

    @CustomerMarketingClientListEventsDoc()
    @ResponsePaging('customerMarketing.workspace.listEvents')
    @ClientCredentialProtected({
        subject: ENUM_POLICY_SUBJECT.CUSTOMER,
        action: [ENUM_POLICY_ACTION.READ],
    })
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
