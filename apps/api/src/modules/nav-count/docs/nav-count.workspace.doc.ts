import {
    Doc,
    DocAuth,
    DocRequest,
    DocResponse,
} from '@app/common/doc/decorators/doc.decorator';
import { WorkspaceDocParamsId } from '@app/modules/workspace/constants/workspace.doc.constant';
import { applyDecorators } from '@nestjs/common';
import { NavCountGetResponseDto } from '../dtos/response/nav-count.get.response.dto';

export function NavCountWorkspaceGetDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary:
                'Get workspace nav-badge counts (needs-attention aggregates)',
        }),
        DocRequest({
            params: [...WorkspaceDocParamsId],
        }),
        DocAuth({
            xApiKey: true,
            jwtAccessToken: true,
        }),
        DocResponse<NavCountGetResponseDto>('navCount.workspace.get', {
            dto: NavCountGetResponseDto,
        })
    );
}
