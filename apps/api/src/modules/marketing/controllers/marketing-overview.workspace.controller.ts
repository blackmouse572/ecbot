import { IResponse } from '@app/common/response/interfaces/response.interface';
import { ApiKeyProtected } from '@app/modules/api-key/decorators/api-key.decorator';
import { AuthJwtAccessProtected } from '@app/modules/auth/decorators/auth.jwt.decorator';
import { FeatureFlagProtected } from '@app/modules/feature-flag/decorators/feature-flag.decorator';
import { ENUM_FEATURE_FLAG } from '@app/modules/feature-flag/enums/feature-flag.enum';
import {
    ENUM_POLICY_ACTION,
    ENUM_POLICY_SUBJECT,
} from '@app/modules/policy/enums/policy.enum';
import { UserProtected } from '@app/modules/user/decorators/user.decorator';
import {
    WorkspacePayload,
    WorkspacePolicyAbilityProtected,
} from '@app/modules/workspace/decorators/workspace.decorator';
import { WorkspaceEntity } from '@app/modules/workspace/repository/entities/workspace.entity';
import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Response } from 'src/common/response/decorators/response.decorator';
import { MarketingOverviewWorkspaceGetDoc } from '../docs/marketing-overview.workspace.doc';
import { MarketingOverviewResponseDto } from '../dtos/response/marketing-overview.response.dto';
import { MarketingOverviewService } from '../services/marketing-overview.service';

@ApiTags('modules.workspace.marketingOverview')
@FeatureFlagProtected(ENUM_FEATURE_FLAG.MARKETING)
@Controller({ version: '1', path: '/:workspace/marketing/overview' })
export class MarketingOverviewWorkspaceController {
    constructor(private readonly overviewService: MarketingOverviewService) {}

    @MarketingOverviewWorkspaceGetDoc()
    @Response('marketingOverview.workspace.get')
    @WorkspacePolicyAbilityProtected({
        subject: ENUM_POLICY_SUBJECT.CUSTOMER,
        action: [ENUM_POLICY_ACTION.READ],
    })
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Get('/')
    async get(
        @WorkspacePayload() workspace: WorkspaceEntity
    ): Promise<IResponse<MarketingOverviewResponseDto>> {
        return { data: await this.overviewService.get(workspace.id) };
    }
}
