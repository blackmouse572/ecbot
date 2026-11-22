import { ENUM_ACTIVITY_ACTION } from '@app/modules/activity/enums/activity.enum';
import { ActivityService } from '@app/modules/activity/services/activity.service';
import {
    ClientCredentialPayload,
    ClientCredentialProtected,
} from '@app/modules/client-credential/decorators/client-credential.decorator';
import { ClientCredentialEntity } from '@app/modules/client-credential/repository/entities/client-credential.entity';
import { FeatureFlagProtected } from '@app/modules/feature-flag/decorators/feature-flag.decorator';
import { ENUM_FEATURE_FLAG } from '@app/modules/feature-flag/enums/feature-flag.enum';
import {
    ENUM_POLICY_ACTION,
    ENUM_POLICY_SUBJECT,
} from '@app/modules/policy/enums/policy.enum';
import { WorkspacePayload } from '@app/modules/workspace/decorators/workspace.decorator';
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

// 3rd-party surface: the workspace comes from the credential, and changes
// are logged as the member who created it.
@ApiTags('modules.client.marketingSettings')
@FeatureFlagProtected(ENUM_FEATURE_FLAG.MARKETING)
@Controller('/marketing/settings')
export class MarketingSettingsClientController {
    constructor(
        private readonly settingsService: MarketingSettingsService,
        private readonly activityService: ActivityService
    ) {}

    @MarketingSettingsGetDoc('client')
    @Response('marketingSettings.get')
    @ClientCredentialProtected({
        subject: ENUM_POLICY_SUBJECT.MARKETING,
        action: [ENUM_POLICY_ACTION.READ],
    })
    @Get('/')
    async get(
        @WorkspacePayload() workspace: WorkspaceEntity
    ): Promise<IResponse<MarketingSettingsGetResponseDto>> {
        return { data: await this.settingsService.get(workspace.id) };
    }

    @MarketingSettingsUpdateDoc('client')
    @Response('marketingSettings.update')
    @ClientCredentialProtected({
        subject: ENUM_POLICY_SUBJECT.MARKETING,
        action: [ENUM_POLICY_ACTION.UPDATE],
    })
    @Patch('/')
    async update(
        @WorkspacePayload() workspace: WorkspaceEntity,
        @ClientCredentialPayload() credential: ClientCredentialEntity,
        @Body() body: MarketingSettingsUpdateRequestDto
    ): Promise<IResponse<MarketingSettingsGetResponseDto>> {
        const data = await this.settingsService.update(workspace.id, body);
        await this.activityService.createByUserWithWorkspace(
            credential.createdBy,
            workspace,
            {
                action: ENUM_ACTIVITY_ACTION.UPDATE,
                subject: ENUM_POLICY_SUBJECT.CUSTOMER,
                metadata: { marketingSettings: Object.keys(body) },
            }
        );
        return { data };
    }
}
