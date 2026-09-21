import {
    Controller,
    Delete,
    ForbiddenException,
    Get,
    Param,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import {
    PaginationQuery,
    PaginationQueryFilterInEnum,
} from 'src/common/pagination/decorators/pagination.decorator';
import { PaginationListDto } from 'src/common/pagination/dtos/pagination.list.dto';
import { PaginationService } from 'src/common/pagination/services/pagination.service';
import { RequestRequiredPipe } from 'src/common/request/pipes/request.required.pipe';
import {
    Response,
    ResponsePaging,
} from 'src/common/response/decorators/response.decorator';
import {
    IResponse,
    IResponsePaging,
} from 'src/common/response/interfaces/response.interface';
import { ApiKeyProtected } from 'src/modules/api-key/decorators/api-key.decorator';
import {
    AuthJwtAccessProtected,
    AuthJwtPayload,
} from 'src/modules/auth/decorators/auth.jwt.decorator';
import {
    PolicyAbilityProtected,
    PolicyRoleProtected,
} from 'src/modules/policy/decorators/policy.decorator';
import {
    ENUM_POLICY_ACTION,
    ENUM_POLICY_ROLE_TYPE,
    ENUM_POLICY_SUBJECT,
} from 'src/modules/policy/enums/policy.enum';
import { SESSION_DEFAULT_AVAILABLE_SEARCH } from 'src/modules/session/constants/session.list.constant';
import {
    SessionAdminBulkRevokeDoc,
    SessionAdminGlobalListDoc,
    SessionAdminGlobalRevokeDoc,
} from 'src/modules/session/docs/session.admin.doc';
import { SessionAdminListResponseDto } from 'src/modules/session/dtos/response/session.admin-list.response.dto';
import { ENUM_SESSION_STATUS } from 'src/modules/session/enums/session.enum';
import { ENUM_SESSION_STATUS_CODE_ERROR } from 'src/modules/session/enums/session.status-code.enum';
import { SessionActiveParsePipe } from 'src/modules/session/pipes/session.parse.pipe';
import { SessionEntity } from 'src/modules/session/repository/entities/session.entity';
import { SessionService } from 'src/modules/session/services/session.service';
import {
    UserParam,
    UserProtected,
} from 'src/modules/user/decorators/user.decorator';
import { UserParsePipe } from 'src/modules/user/pipes/user.parse.pipe';
import { UserEntity } from 'src/modules/user/repository/entities/user.entity';

@ApiTags('modules.admin.session')
@Controller({
    version: '1',
    path: '/session',
})
export class SessionAdminGlobalController {
    constructor(
        private readonly paginationService: PaginationService,
        private readonly sessionService: SessionService
    ) {}

    @SessionAdminGlobalListDoc()
    @ResponsePaging('session.list')
    @PolicyAbilityProtected({
        subject: ENUM_POLICY_SUBJECT.SESSION,
        action: [ENUM_POLICY_ACTION.READ],
    })
    @PolicyRoleProtected(ENUM_POLICY_ROLE_TYPE.ADMIN)
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Get('/list')
    async list(
        @PaginationQuery({ availableSearch: SESSION_DEFAULT_AVAILABLE_SEARCH })
        { _search, _limit, _offset, _order }: PaginationListDto,
        @PaginationQueryFilterInEnum('status', undefined, ENUM_SESSION_STATUS)
        _status: Record<string, any> | undefined,
        @AuthJwtPayload('session') currentSessionId: string
    ): Promise<IResponsePaging<SessionAdminListResponseDto>> {
        const find: Record<string, any> = {
            ..._search,
            ...(_status ? _status : {}),
        };

        const sessions: SessionEntity[] = await this.sessionService.findAll(
            find,
            {
                paging: { limit: _limit, offset: _offset },
                order: _order,
                populate: ['user'],
            }
        );
        const total: number = await this.sessionService.getTotal(find);
        const totalPage: number = this.paginationService.totalPage(
            total,
            _limit
        );

        return {
            _pagination: { total, totalPage },
            data: this.sessionService.mapAdminList(
                sessions,
                currentSessionId
            ),
        };
    }

    @SessionAdminGlobalRevokeDoc()
    @Response('session.revoke')
    @PolicyAbilityProtected({
        subject: ENUM_POLICY_SUBJECT.SESSION,
        action: [ENUM_POLICY_ACTION.DELETE],
    })
    @PolicyRoleProtected(ENUM_POLICY_ROLE_TYPE.ADMIN)
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Delete('/revoke/:session')
    async revoke(
        @Param('session', RequestRequiredPipe, SessionActiveParsePipe)
        session: SessionEntity,
        @AuthJwtPayload('session') sessionFromRequest: string
    ): Promise<void> {
        // Guard against an admin revoking their own active session and locking
        // themselves out.
        if (session.id === sessionFromRequest) {
            throw new ForbiddenException({
                statusCode: ENUM_SESSION_STATUS_CODE_ERROR.FORBIDDEN_REVOKE,
                message: 'session.error.forbiddenRevoke',
            });
        }

        await this.sessionService.updateRevoke(session);
    }

    @SessionAdminBulkRevokeDoc()
    @Response('session.bulkRevoke')
    @PolicyAbilityProtected({
        subject: ENUM_POLICY_SUBJECT.SESSION,
        action: [ENUM_POLICY_ACTION.DELETE],
    })
    @PolicyRoleProtected(ENUM_POLICY_ROLE_TYPE.ADMIN)
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Delete('/revoke/user/:user')
    async bulkRevoke(
        @UserParam('user', RequestRequiredPipe, UserParsePipe) user: UserEntity,
        @AuthJwtPayload('user') currentUserId: string
    ): Promise<IResponse<boolean>> {
        // Bulk-revoking your own account would kill your current session too;
        // block an admin from targeting themselves.
        if (user.id === currentUserId) {
            throw new ForbiddenException({
                statusCode: ENUM_SESSION_STATUS_CODE_ERROR.FORBIDDEN_REVOKE,
                message: 'session.error.forbiddenRevoke',
            });
        }

        await this.sessionService.updateManyRevokeByUser(user.id);
        return { data: true };
    }
}
