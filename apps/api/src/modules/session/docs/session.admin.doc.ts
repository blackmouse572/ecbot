import { applyDecorators } from '@nestjs/common';
import {
    Doc,
    DocAuth,
    DocGuard,
    DocRequest,
    DocResponse,
    DocResponsePaging,
} from 'src/common/doc/decorators/doc.decorator';
import {
    SessionDocParamsId,
    SessionDocQueryStatus,
} from 'src/modules/session/constants/session.doc.constant';
import { SessionAdminListResponseDto } from 'src/modules/session/dtos/response/session.admin-list.response.dto';
import { SessionListResponseDto } from 'src/modules/session/dtos/response/session.list.response.dto';
import { UserDocParamsId } from 'src/modules/user/constants/user.doc.constant';

export function SessionAdminListDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'get all user sessions',
        }),
        DocRequest({
            params: UserDocParamsId,
        }),
        DocAuth({
            xApiKey: true,
            jwtAccessToken: true,
        }),
        DocGuard({ role: true, policy: true }),
        DocResponsePaging<SessionListResponseDto>('session.list', {
            dto: SessionListResponseDto,
        })
    );
}

export function SessionAdminRevokeDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'revoke user session',
        }),
        DocRequest({
            params: [...SessionDocParamsId, ...UserDocParamsId],
        }),
        DocAuth({
            xApiKey: true,
            jwtAccessToken: true,
        }),
        DocResponse('session.revoke')
    );
}

// Global (cross-user) admin session endpoints.
export function SessionAdminGlobalListDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'get all sessions across users',
        }),
        DocRequest({
            queries: [...SessionDocQueryStatus],
        }),
        DocAuth({
            xApiKey: true,
            jwtAccessToken: true,
        }),
        DocGuard({ role: true, policy: true }),
        DocResponsePaging<SessionAdminListResponseDto>('session.list', {
            dto: SessionAdminListResponseDto,
        })
    );
}

export function SessionAdminGlobalRevokeDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'revoke a session by id',
        }),
        DocRequest({
            params: [...SessionDocParamsId],
        }),
        DocAuth({
            xApiKey: true,
            jwtAccessToken: true,
        }),
        DocResponse('session.revoke')
    );
}

export function SessionAdminBulkRevokeDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'revoke all sessions for a user',
        }),
        DocRequest({
            params: [...UserDocParamsId],
        }),
        DocAuth({
            xApiKey: true,
            jwtAccessToken: true,
        }),
        DocResponse('session.bulkRevoke')
    );
}
