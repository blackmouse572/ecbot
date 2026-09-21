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
                'Create a request to join a workspace using an invitation code. This creates a request for the workspace owner to approve.',
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
        DocResponse('workspace.joinRequest.success')
    );
}
