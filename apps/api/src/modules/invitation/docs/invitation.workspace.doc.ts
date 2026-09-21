import {
    Doc,
    DocAuth,
    DocGuard,
    DocRequest,
    DocResponse,
    DocResponsePaging,
} from '@app/common/doc/decorators/doc.decorator';
import { WorkspaceDocParamsId } from '@app/modules/workspace/constants/workspace.doc.constant';
import { applyDecorators } from '@nestjs/common';
import { InvitationIdDocParamsId } from '../constants/invitation.doc.constant';
import { InvitationDetailResponseDto } from '../dtos/response/invitation-detail.response.dto';
import { InvitationListResponseDto } from '../dtos/response/invitation-list.response.dto';

export function InvitationListDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'Get workspace invitations',
            description: 'Retrieve all invitations for a workspace',
        }),
        DocAuth({
            xApiKey: true,
            jwtAccessToken: true,
        }),
        DocGuard({ role: true }),
        DocRequest({
            params: WorkspaceDocParamsId,
        }),
        DocResponsePaging('invitation.list', {
            dto: InvitationListResponseDto,
        })
    );
}

export function InvitationDetailDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'Get invitation details',
            description:
                'Retrieve detailed information about a specific invitation',
        }),
        DocRequest({
            params: [...WorkspaceDocParamsId, ...InvitationIdDocParamsId],
        }),
        DocAuth({
            xApiKey: true,
            jwtAccessToken: true,
        }),
        DocGuard({ role: true }),
        DocResponse('invitation.regenerate', {
            dto: InvitationDetailResponseDto,
        })
    );
}

export function InvitationUpdateRoleDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'Update invitation role',
            description: 'Update the role assigned to a pending invitation',
        }),
        DocRequest({
            params: [...WorkspaceDocParamsId, ...InvitationIdDocParamsId],
        }),
        DocAuth({
            xApiKey: true,
            jwtAccessToken: true,
        }),
        DocGuard({ role: true }),
        DocResponse('invitation.regenerate', {
            dto: InvitationDetailResponseDto,
        })
    );
}

export function InvitationRegenerateDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'Regenerate invitation link',
            description:
                'Generate a new invitation link for a pending invitation',
        }),
        DocRequest({
            params: [...WorkspaceDocParamsId, ...InvitationIdDocParamsId],
        }),
        DocAuth({
            xApiKey: true,
            jwtAccessToken: true,
        }),
        DocGuard({ role: true }),
        DocResponse('invitation.regenerate', {
            dto: InvitationDetailResponseDto,
        })
    );
}

export function InvitationRevokeDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'Revoke invitation',
            description: 'Revoke a pending invitation',
        }),
        DocResponse('invitation.revoke', {
            dto: InvitationDetailResponseDto,
        }),
        DocAuth({
            xApiKey: true,
            jwtAccessToken: true,
        }),
        DocGuard({ role: true }),
        DocRequest({
            params: [...WorkspaceDocParamsId, ...InvitationIdDocParamsId],
        })
    );
}
