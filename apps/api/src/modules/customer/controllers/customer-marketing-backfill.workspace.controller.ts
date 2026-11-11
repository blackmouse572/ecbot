import { IResponse } from '@app/common/response/interfaces/response.interface';
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
import { Controller, Get, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Response } from 'src/common/response/decorators/response.decorator';
import {
    CustomerMarketingBackfillWorkspaceGetDoc,
    CustomerMarketingBackfillWorkspaceStartDoc,
} from '../docs/customer-marketing-backfill.doc';
import { MarketingBackfillGetResponseDto } from '../dtos/response/marketing-backfill.get.response.dto';
import { CustomerMarketingBackfillService } from '../services/customer-marketing-backfill.service';

@ApiTags('modules.workspace.customerMarketing')
@Controller({
    version: '1',
    path: '/:workspace/customers/marketing/backfill',
})
export class CustomerMarketingBackfillWorkspaceController {
    constructor(
        private readonly backfillService: CustomerMarketingBackfillService
    ) {}

    @CustomerMarketingBackfillWorkspaceGetDoc()
    @Response('customerMarketing.backfill.get')
    @WorkspaceScopedProtected({
        subject: ENUM_POLICY_SUBJECT.CUSTOMER,
        action: [ENUM_POLICY_ACTION.READ],
    })
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Get('/')
    async get(
        @WorkspacePayload() workspace: WorkspaceEntity
    ): Promise<IResponse<MarketingBackfillGetResponseDto>> {
        const run = await this.backfillService.getRun(workspace.id);
        return { data: this.backfillService.mapGet(run) };
    }

    @CustomerMarketingBackfillWorkspaceStartDoc()
    @Response('customerMarketing.backfill.start')
    @WorkspaceScopedProtected({
        subject: ENUM_POLICY_SUBJECT.CUSTOMER,
        action: [ENUM_POLICY_ACTION.UPDATE],
    })
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Post('/')
    async start(
        @WorkspacePayload() workspace: WorkspaceEntity,
        @AuthJwtPayload('user', UserParsePipe) user: UserEntity
    ): Promise<IResponse<MarketingBackfillGetResponseDto>> {
        const run = await this.backfillService.start(workspace.id, user.id);
        return { data: this.backfillService.mapGet(run) };
    }
}
