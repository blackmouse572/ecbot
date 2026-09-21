import {
    Doc,
    DocAuth,
    DocRequest,
    DocResponse,
    DocResponsePaging,
} from '@app/common/doc/decorators/doc.decorator';
import { WorkspaceDocParamsId } from '@app/modules/workspace/constants/workspace.doc.constant';
import { applyDecorators } from '@nestjs/common';
import { FollowupListResponseDto } from '../dtos/response/followup.list.response.dto';

export function FollowupWorkspaceListDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'List followups in a workspace, pending and completed',
        }),
        DocRequest({
            params: [...WorkspaceDocParamsId],
        }),
        DocAuth({
            xApiKey: true,
            jwtAccessToken: true,
        }),
        DocResponsePaging<FollowupListResponseDto>('followup.workspace.list', {
            dto: FollowupListResponseDto,
        })
    );
}

export function FollowupWorkspaceCancelDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'Cancel a pending followup',
        }),
        DocRequest({
            params: [...WorkspaceDocParamsId],
        }),
        DocAuth({
            xApiKey: true,
            jwtAccessToken: true,
        }),
        DocResponse('followup.workspace.cancel')
    );
}
