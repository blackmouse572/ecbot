import { DatabaseIdResponseDto } from '@app/common/database/dtos/response/database.id.response.dto';
import {
    Doc,
    DocAuth,
    DocGuard,
    DocRequest,
    DocResponse,
    DocResponsePaging,
} from '@app/common/doc/decorators/doc.decorator';
import { ENUM_DOC_REQUEST_BODY_TYPE } from '@app/common/doc/enums/doc.enum';
import { WorkspaceDocParamsId } from '@app/modules/workspace/constants/workspace.doc.constant';
import { applyDecorators } from '@nestjs/common';
import {
    RoleDocParamsId,
    RoleDocQueryIsActive,
    RoleDocQueryType,
} from '../constants/role.doc.constant';
import { RoleCreateWorkspaceRequestDto } from '../dtos/request/role.create.request.dto';
import { RoleUpdateWorkspaceRequestDto } from '../dtos/request/role.update.request.dto';
import { RoleGetResponseDto } from '../dtos/response/role.get.response.dto';
import { RoleListResponseDto } from '../dtos/response/role.list.response.dto';

export function RoleWorkspaceListDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'get all workspace roles',
        }),
        DocRequest({
            queries: [...RoleDocQueryIsActive, ...RoleDocQueryType],
            params: WorkspaceDocParamsId,
        }),
        DocAuth({
            xApiKey: true,
            jwtAccessToken: true,
        }),
        DocGuard({ role: true, policy: true }),
        DocResponsePaging<RoleListResponseDto>('role.list', {
            dto: RoleListResponseDto,
        })
    );
}

export function RoleWorkspaceGetDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'get detail a workspace role',
        }),
        DocRequest({
            params: [...WorkspaceDocParamsId, ...RoleDocParamsId],
        }),
        DocAuth({
            xApiKey: true,
            jwtAccessToken: true,
        }),
        DocGuard({ role: true, policy: true }),
        DocResponse<RoleGetResponseDto>('role.get', {
            dto: RoleGetResponseDto,
        })
    );
}

export function RoleWorkspaceCreateDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'create a new workspace role',
        }),
        DocRequest({
            dto: RoleCreateWorkspaceRequestDto,
            bodyType: ENUM_DOC_REQUEST_BODY_TYPE.JSON,
            params: WorkspaceDocParamsId,
        }),
        DocAuth({
            xApiKey: true,
            jwtAccessToken: true,
        }),
        DocGuard({ role: true, policy: true }),
        DocResponse<DatabaseIdResponseDto>('role.create', {
            dto: DatabaseIdResponseDto,
        })
    );
}

export function RoleWorkspaceUpdateDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'update a workspace role',
        }),
        DocRequest({
            params: [...WorkspaceDocParamsId, ...RoleDocParamsId],
            dto: RoleUpdateWorkspaceRequestDto,
            bodyType: ENUM_DOC_REQUEST_BODY_TYPE.JSON,
        }),
        DocAuth({
            xApiKey: true,
            jwtAccessToken: true,
        }),
        DocGuard({ role: true, policy: true }),
        DocResponse<RoleGetResponseDto>('role.update', {
            dto: RoleGetResponseDto,
        })
    );
}

export function RoleWorkspaceInactiveDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'inactivate a workspace role',
        }),
        DocRequest({
            params: [...WorkspaceDocParamsId, ...RoleDocParamsId],
        }),
        DocAuth({
            xApiKey: true,
            jwtAccessToken: true,
        }),
        DocGuard({ role: true, policy: true }),
        DocResponse<RoleGetResponseDto>('role.inactive', {
            dto: RoleGetResponseDto,
        })
    );
}

export function RoleWorkspaceActiveDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'activate a workspace role',
        }),
        DocRequest({
            params: [...WorkspaceDocParamsId, ...RoleDocParamsId],
        }),
        DocAuth({
            xApiKey: true,
            jwtAccessToken: true,
        }),
        DocGuard({ role: true, policy: true }),
        DocResponse<RoleGetResponseDto>('role.active', {
            dto: RoleGetResponseDto,
        })
    );
}

export function RoleWorkspaceDeleteDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'delete a workspace role',
        }),
        DocRequest({
            params: [...WorkspaceDocParamsId, ...RoleDocParamsId],
        }),
        DocAuth({
            xApiKey: true,
            jwtAccessToken: true,
        }),
        DocGuard({ role: true, policy: true }),
        DocResponse<RoleGetResponseDto>('role.delete', {
            dto: RoleGetResponseDto,
        })
    );
}
