import {
    Doc,
    DocAuth,
    DocGuard,
    DocRequest,
    DocResponse,
    DocResponsePaging,
} from '@app/common/doc/decorators/doc.decorator';
import { ENUM_DOC_REQUEST_BODY_TYPE } from '@app/common/doc/enums/doc.enum';
import { UserDocParamsId } from '@app/modules/user/constants/user.doc.constant';
import { applyDecorators } from '@nestjs/common';
import { WorkspaceDocParamsId } from '../constants/workspace.doc.constant';
import { WorkSpaceCreateRequestDto } from '../dtos/request/workspace.create.request';
import { WorkSpaceInviteMemberRequestDto } from '../dtos/request/workspace.invite-member.request';
import { WorkSpaceUpdateRequestDto } from '../dtos/request/workspace.update.request';
import { WorkspaceInvitableCoMemberResponseDto } from '../dtos/response/workspace-invitable-co-member.response.dto';
import { WorkspaceMemberGetResponseDto } from '../dtos/response/workspace-member.get.response.dto';
import { WorkspaceMemberListResponseDto } from '../dtos/response/workspace-member.list.response.dto';
import { WorkspaceGetProfileResponseDto } from '../dtos/response/workspace.get-profile.response';
import { WorkSpaceGetResponseDto } from '../dtos/response/workspace.get.response';

// Shared by the three member-scoped docs below: both list-and-detail-style
// endpoints sit behind a CASL policy check rather than a bare role check.
const MEMBER_POLICY_GUARD = { policy: true };
// The workspace id plus the target user id: every per-member endpoint takes both.
const WORKSPACE_MEMBER_PARAMS = [...WorkspaceDocParamsId, ...UserDocParamsId];

export function WorkSpaceOwnerGetDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'Get workspace details by id or slug',
        }),
        DocAuth({
            jwtAccessToken: true,
        }),
        DocGuard({
            role: true,
        }),
        DocResponse('workspace.details', {
            dto: WorkSpaceGetResponseDto,
        }),
        DocRequest({
            params: WorkspaceDocParamsId,
        })
    );
}
export function WorkSpaceOwnerCreateDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'Create a new work space for the owner',
        }),
        DocAuth({
            jwtAccessToken: true,
        }),
        DocRequest({
            bodyType: ENUM_DOC_REQUEST_BODY_TYPE.JSON,
            dto: WorkSpaceCreateRequestDto,
        }),
        DocGuard({
            role: true,
        }),
        DocResponse('workspace.create', {
            dto: WorkSpaceGetResponseDto,
        })
    );
}

export function WorkSpaceOwnerGetListDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'Get list all workspaces of the owner',
        }),
        DocAuth({
            jwtAccessToken: true,
        }),
        DocRequest({
            queries: [],
        }),
        DocGuard({
            role: true,
        }),
        DocResponsePaging('workspace.list', {
            dto: WorkSpaceGetResponseDto,
        })
    );
}

export function WorkSpaceOwnerUpdateDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'Update a work space information for the owner',
        }),
        DocAuth({
            jwtAccessToken: true,
        }),
        DocGuard({
            role: true,
        }),
        DocRequest({
            bodyType: ENUM_DOC_REQUEST_BODY_TYPE.JSON,
            dto: WorkSpaceUpdateRequestDto,
            params: WorkspaceDocParamsId,
        }),
        DocResponse('workspace.update')
    );
}

export function WorkSpaceOwnerDeleteDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'Delete a work space and all its data for the owner',
        }),
        DocAuth({
            jwtAccessToken: true,
        }),
        DocGuard({
            role: true,
        }),
        DocRequest({
            params: WorkspaceDocParamsId,
        }),
        DocResponse('workspace.delete')
    );
}

export function WorkspaceInvitationDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'Invite a user to a work space',
        }),
        DocAuth({
            jwtAccessToken: true,
            xApiKey: true,
        }),
        DocGuard({
            role: true,
        }),
        DocRequest({
            bodyType: ENUM_DOC_REQUEST_BODY_TYPE.JSON,
            dto: WorkSpaceInviteMemberRequestDto,
            params: WorkspaceDocParamsId,
        }),
        DocResponse('workspace.invite')
    );
}

export function WorkSpaceOwnerMembersListDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'List the members of a workspace',
        }),
        DocAuth({
            jwtAccessToken: true,
            xApiKey: true,
        }),
        DocGuard(MEMBER_POLICY_GUARD),
        DocResponsePaging('workspace.member.list', {
            dto: WorkspaceMemberListResponseDto,
        }),
        DocRequest({
            params: WorkspaceDocParamsId,
        })
    );
}
export function WorkSpaceOwnerGetMemberDetailsDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: "Get a workspace member's details",
        }),
        DocAuth({
            jwtAccessToken: true,
            xApiKey: true,
        }),
        DocGuard(MEMBER_POLICY_GUARD),
        DocResponse('workspace.member.details', {
            dto: WorkspaceMemberGetResponseDto,
        }),
        DocRequest({
            params: WORKSPACE_MEMBER_PARAMS,
        })
    );
}

export function WorkSpaceOwnerMemberRemoveDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'Remove a member from a workspace',
        }),
        DocAuth({
            jwtAccessToken: true,
            xApiKey: true,
        }),
        DocGuard(MEMBER_POLICY_GUARD),
        DocResponse('workspace.member.remove', {
            dto: WorkSpaceGetResponseDto,
        }),
        DocRequest({ params: WORKSPACE_MEMBER_PARAMS })
    );
}
export function GetInvitableUserListDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'Get all users that not belong to the workspace',
            description:
                'This endpoint retrieves users eligible to invite: a fuzzy name search over users who already share a workspace with the caller (no email in these results), or an exact match by email for anyone else on the platform when the search value is a full email address.',
        }),
        DocAuth({
            jwtAccessToken: true,
            xApiKey: true,
        }),
        DocGuard(MEMBER_POLICY_GUARD),
        DocResponsePaging<WorkspaceInvitableCoMemberResponseDto>(
            'workspace.member.list',
            {
                dto: WorkspaceInvitableCoMemberResponseDto,
            }
        ),
        DocRequest({
            params: WorkspaceDocParamsId,
        })
    );
}

export function WorkspaceAssignRoleToMemberDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'Assign a role to a workspace member',
            description:
                'This endpoint assigns a specific role to a member within a workspace. The member must already be part of the workspace.',
        }),
        DocAuth({
            jwtAccessToken: true,
        }),
        DocGuard({
            policy: true,
        }),
        DocResponse('workspace.member.role.assign.success'),
        DocRequest({
            params: [
                ...WorkspaceDocParamsId,
                {
                    name: 'member',
                    description: 'The ID of the member to assign the role to',
                    required: true,
                    type: 'string',
                },
                {
                    name: 'role',
                    description: 'The ID of the role to assign',
                    required: true,
                    type: 'string',
                },
            ],
        })
    );
}

export function WorkspaceOwnerProfileDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'get profile of a workspace',
        }),
        DocAuth({
            xApiKey: true,
            jwtAccessToken: true,
        }),
        DocRequest({
            params: [...WorkspaceDocParamsId],
        }),
        DocResponse<WorkspaceGetProfileResponseDto>('user.profile', {
            dto: WorkspaceGetProfileResponseDto,
        })
    );
}
