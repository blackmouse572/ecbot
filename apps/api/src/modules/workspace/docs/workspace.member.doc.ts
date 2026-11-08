import {
    Doc,
    DocAuth,
    DocGuard,
    DocRequest,
    DocResponse,
} from '@app/common/doc/decorators/doc.decorator';
import { InvitationIdDocParamsId } from '@app/modules/invitation/constants/invitation.doc.constant';
import { applyDecorators } from '@nestjs/common';
import { WorkspaceJoinResultResponseDto } from '../dtos/response/workspace.join-result.response.dto';
import { WorkspaceMyInvitationResponseDto } from '../dtos/response/workspace.my-invitation.response.dto';

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

export function WorkspaceMyInvitationListDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'List my pending invitations',
            description:
                "Pending, unexpired invitations sent to the signed-in user's verified email. Empty when the email is not verified.",
        }),
        DocAuth({ jwtAccessToken: true }),
        DocGuard({ role: true }),
        DocResponse('workspace.member.invitations.list', {
            dto: WorkspaceMyInvitationResponseDto,
            isArray: true,
        })
    );
}

export function WorkspaceMyInvitationAcceptDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'Accept one of my invitations',
            description:
                'Joins the workspace with the invitation role (Member when it has none). 404 when the invitation is not a pending one sent to my verified email.',
        }),
        DocAuth({ jwtAccessToken: true }),
        DocGuard({ role: true }),
        DocRequest({ params: InvitationIdDocParamsId }),
        DocResponse('workspace.member.join.success', {
            dto: WorkspaceJoinResultResponseDto,
        })
    );
}

export function WorkspaceMyInvitationDeclineDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'Decline one of my invitations',
            description:
                "Marks it revoked by me, so it leaves the owner's pending list. 404 when it is not a pending one sent to my verified email.",
        }),
        DocAuth({ jwtAccessToken: true }),
        DocGuard({ role: true }),
        DocRequest({ params: InvitationIdDocParamsId }),
        DocResponse('workspace.member.invitations.decline')
    );
}
