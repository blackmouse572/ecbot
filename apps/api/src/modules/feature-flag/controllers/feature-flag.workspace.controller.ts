import { IResponse } from '@app/common/response/interfaces/response.interface';
import { ApiKeyProtected } from '@app/modules/api-key/decorators/api-key.decorator';
import { AuthJwtAccessProtected } from '@app/modules/auth/decorators/auth.jwt.decorator';
import { UserProtected } from '@app/modules/user/decorators/user.decorator';
import {
    WorkspaceMemberOrOwnerProtected,
    WorkspacePayload,
} from '@app/modules/workspace/decorators/workspace.decorator';
import { WorkspaceEntity } from '@app/modules/workspace/repository/entities/workspace.entity';
import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { plainToInstance } from 'class-transformer';
import { Response } from 'src/common/response/decorators/response.decorator';
import { FeatureFlagWorkspaceGetDoc } from '../docs/feature-flag.workspace.doc';
import { FeatureFlagGetResponseDto } from '../dtos/response/feature-flag.get.response.dto';
import { FeatureFlagService } from '../services/feature-flag.service';

@ApiTags('modules.workspace.featureFlag')
@Controller({ version: '1', path: '/:workspace/feature-flags' })
export class FeatureFlagWorkspaceController {
    constructor(private readonly featureFlagService: FeatureFlagService) {}

    @FeatureFlagWorkspaceGetDoc()
    @Response('featureFlag.workspace.get')
    @WorkspaceMemberOrOwnerProtected()
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Get('/')
    async get(
        @WorkspacePayload() workspace: WorkspaceEntity
    ): Promise<IResponse<FeatureFlagGetResponseDto>> {
        const flags = await this.featureFlagService.forWorkspace(workspace.id);
        return {
            data: plainToInstance(FeatureFlagGetResponseDto, flags, {
                excludeExtraneousValues: true,
            }),
        };
    }
}
