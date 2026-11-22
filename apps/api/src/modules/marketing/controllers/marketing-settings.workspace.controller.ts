import { ENUM_ACTIVITY_ACTION } from '@app/modules/activity/enums/activity.enum';
import { ActivityService } from '@app/modules/activity/services/activity.service';
import { ApiKeyProtected } from '@app/modules/api-key/decorators/api-key.decorator';
import {
    AuthJwtAccessProtected,
    AuthJwtPayload,
} from '@app/modules/auth/decorators/auth.jwt.decorator';
import { FeatureFlagProtected } from '@app/modules/feature-flag/decorators/feature-flag.decorator';
import { ENUM_FEATURE_FLAG } from '@app/modules/feature-flag/enums/feature-flag.enum';
import {
    ENUM_POLICY_ACTION,
    ENUM_POLICY_SUBJECT,
} from '@app/modules/policy/enums/policy.enum';
import { UserProtected } from '@app/modules/user/decorators/user.decorator';
import { UserParsePipe } from '@app/modules/user/pipes/user.parse.pipe';
import { UserEntity } from '@app/modules/user/repository/entities/user.entity';
import {
    WorkspacePayload,
    WorkspacePolicyAbilityProtected,
} from '@app/modules/workspace/decorators/workspace.decorator';
import { WorkspaceEntity } from '@app/modules/workspace/repository/entities/workspace.entity';
import { Body, Controller, Get, Patch } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Response } from 'src/common/response/decorators/response.decorator';
import { IResponse } from 'src/common/response/interfaces/response.interface';
import {
    MarketingSettingsGetDoc,
    MarketingSettingsUpdateDoc,
} from '../docs/marketing-settings.doc';
import { MarketingSettingsUpdateRequestDto } from '../dtos/request/marketing-settings.update.request.dto';
import { MarketingSettingsGetResponseDto } from '../dtos/response/marketing-settings.get.response.dto';
import { MarketingSettingsService } from '../services/marketing-settings.service';

@ApiTags('modules.workspace.marketingSettings')
@FeatureFlagProtected(ENUM_FEATURE_FLAG.MARKETING)
@Controller({ version: '1', path: '/:workspace/marketing/settings' })
export class MarketingSettingsWorkspaceController {
    constructor(
        private readonly settingsService: MarketingSettingsService,
        private readonly activityService: ActivityService
    ) {}

    @MarketingSettingsGetDoc('workspace')
    @Response('marketingSettings.get')
    @WorkspacePolicyAbilityProtected({
        subject: ENUM_POLICY_SUBJECT.MARKETING,
        action: [ENUM_POLICY_ACTION.READ],
    })
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Get('/')
    async get(
        @WorkspacePayload() workspace: WorkspaceEntity
    ): Promise<IResponse<MarketingSettingsGetResponseDto>> {
        return { data: await this.settingsService.get(workspace.id) };
    }

    @MarketingSettingsUpdateDoc('workspace')
    @Response('marketingSettings.update')
    @WorkspacePolicyAbilityProtected({
        subject: ENUM_POLICY_SUBJECT.MARKETING,
        action: [ENUM_POLICY_ACTION.UPDATE],
    })
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Patch('/')
    async update(
        @WorkspacePayload() workspace: WorkspaceEntity,
        @AuthJwtPayload('user', UserParsePipe) user: UserEntity,
        @Body() body: MarketingSettingsUpdateRequestDto
    ): Promise<IResponse<MarketingSettingsGetResponseDto>> {
        const data = await this.settingsService.update(workspace.id, body);
        await this.activityService.createByUserWithWorkspace(user, workspace, {
            action: ENUM_ACTIVITY_ACTION.UPDATE,
            subject: ENUM_POLICY_SUBJECT.CUSTOMER,
            metadata: { marketingSettings: Object.keys(body) },
        });
        return { data };
    }
}
