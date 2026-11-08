import {
    Doc,
    DocAuth,
    DocGuard,
    DocRequest,
    DocResponse,
} from '@app/common/doc/decorators/doc.decorator';
import { ENUM_DOC_REQUEST_BODY_TYPE } from '@app/common/doc/enums/doc.enum';
import { applyDecorators } from '@nestjs/common';
import { WorkspaceDocInvitationParams } from '../constants/workspace.doc.constant';
import { WorkspaceJoinRequestDto } from '../dtos/request/workspace.join-request.request.dto';
import { WorkspaceMemberGetResponseDto } from '../dtos/response/workspace-member.get.response.dto';
import { WorkspaceJoinResultResponseDto } from '../dtos/response/workspace.join-result.response.dto';

export function WorkspaceFindByInvitationCodeDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'Find workspace by invitation code',
            description:
                'Retrieve workspace information using an invitation code',
        }),
        DocAuth({
            jwtAccessToken: true,
        }),
        DocGuard({
            role: true,
        }),
        DocRequest({
            params: [...WorkspaceDocInvitationParams],
        }),
        DocResponse('workspace.findByInvitationCode.success', {
            dto: WorkspaceMemberGetResponseDto,
        })
    );
}

export function WorkspaceCreateJoinRequestDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'Create request to join workspace by invitation code',
            description:
                'Join a workspace with its code. When the caller has a pending invitation to it (verified email), that invitation is accepted with its role (joined true). Otherwise a request is filed for the owner to approve (joined false, requestId).',
        }),
        DocAuth({
            jwtAccessToken: true,
        }),
        DocGuard({
            role: true,
        }),
        DocRequest({
            bodyType: ENUM_DOC_REQUEST_BODY_TYPE.JSON,
            dto: WorkspaceJoinRequestDto,
            params: [...WorkspaceDocInvitationParams],
        }),
        DocResponse('workspace.joinRequest.success', {
            dto: WorkspaceJoinResultResponseDto,
        })
    );
}
