import {
    Doc,
    DocAuth,
    DocGuard,
    DocRequest,
    DocResponse,
} from '@app/common/doc/decorators/doc.decorator';
import { applyDecorators } from '@nestjs/common';

export function WorkspaceMemberAcceptInvitationDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'Accept invitation and join a workspace',
        }),
        DocAuth({
            jwtAccessToken: true,
        }),
        DocGuard({
            role: true,
        }),
        DocRequest({
            queries: [
                {
                    name: 'token',
                    required: true,
                    type: String,
                    description: 'Invitation token',
                },
            ],
        }),
        DocResponse('workspace.member.join.success')
    );
}
