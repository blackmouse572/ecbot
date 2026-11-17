import {
    Doc,
    DocAuth,
    DocRequest,
    DocResponse,
} from '@app/common/doc/decorators/doc.decorator';
import { WorkspaceDocParamsId } from '@app/modules/workspace/constants/workspace.doc.constant';
import { applyDecorators } from '@nestjs/common';
import { FeatureFlagGetResponseDto } from '../dtos/response/feature-flag.get.response.dto';

export function FeatureFlagWorkspaceGetDoc(): MethodDecorator {
    return applyDecorators(
        Doc({ summary: 'Get the feature flags of a workspace' }),
        DocRequest({ params: [...WorkspaceDocParamsId] }),
        DocAuth({ xApiKey: true, jwtAccessToken: true }),
        DocResponse<FeatureFlagGetResponseDto>('featureFlag.workspace.get', {
            dto: FeatureFlagGetResponseDto,
        })
    );
}
