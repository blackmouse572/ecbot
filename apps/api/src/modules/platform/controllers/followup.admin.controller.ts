import {
    ConflictException,
    Controller,
    Param,
    ParseUUIDPipe,
    Post,
    Get,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ENUM_APP_STATUS_CODE_ERROR } from 'src/app/enums/app.status-code.enum';
import {
    PaginationQuery,
    PaginationQueryFilterEqual,
    PaginationQueryFilterInEnum,
} from 'src/common/pagination/decorators/pagination.decorator';
import { PaginationListDto } from 'src/common/pagination/dtos/pagination.list.dto';
import { ENUM_PAGINATION_ORDER_DIRECTION_TYPE } from 'src/common/pagination/enums/pagination.enum';
import { PaginationService } from 'src/common/pagination/services/pagination.service';
import {
    Response,
    ResponsePaging,
} from 'src/common/response/decorators/response.decorator';
import {
    IResponse,
    IResponsePaging,
} from 'src/common/response/interfaces/response.interface';
import { ApiKeyProtected } from 'src/modules/api-key/decorators/api-key.decorator';
import { AuthJwtAccessProtected } from 'src/modules/auth/decorators/auth.jwt.decorator';
import {
    PolicyAbilityProtected,
    PolicyRoleProtected,
} from 'src/modules/policy/decorators/policy.decorator';
import {
    ENUM_POLICY_ACTION,
    ENUM_POLICY_ROLE_TYPE,
    ENUM_POLICY_SUBJECT,
} from 'src/modules/policy/enums/policy.enum';
import { UserProtected } from 'src/modules/user/decorators/user.decorator';
import { ENUM_FOLLOWUP_STATUS } from '../constants/followup.constant';
import { FOLLOWUP_ADMIN_AVAILABLE_SEARCH } from '../constants/followup.list.constant';
import {
    FollowupAdminCancelDoc,
    FollowupAdminListDoc,
} from '../docs/followup.admin.doc';
import { FollowupAdminListResponseDto } from '../dtos/response/followup.admin-list.response.dto';
import { FollowupService } from '../services/followup.service';

/** Admins see every follow-up and can cancel a pending one; nothing else. */
@ApiTags('modules.admin.followup')
@Controller({
    version: '1',
    path: '/followup',
})
export class FollowupAdminController {
    constructor(
        private readonly followupService: FollowupService,
        private readonly paginationService: PaginationService
    ) {}

    @FollowupAdminListDoc()
    @ResponsePaging('followup.admin.list')
    @PolicyAbilityProtected({
        subject: ENUM_POLICY_SUBJECT.CHATBOT,
        action: [ENUM_POLICY_ACTION.READ],
    })
    @PolicyRoleProtected(ENUM_POLICY_ROLE_TYPE.ADMIN)
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Get('/list')
    async list(
        @PaginationQuery({
            availableSearch: FOLLOWUP_ADMIN_AVAILABLE_SEARCH,
            availableOrderBy: ['scheduledAt', 'createdAt', 'status'],
            defaultOrderBy: 'scheduledAt',
            defaultOrderDirection: ENUM_PAGINATION_ORDER_DIRECTION_TYPE.DESC,
        })
        { _search, _limit, _offset, _order }: PaginationListDto,
        @PaginationQueryFilterEqual('chatbot.workspace', {
            queryField: 'workspace',
        })
        _workspace?: Record<string, any>,
        @PaginationQueryFilterEqual('chatbot.id', { queryField: 'chatbot' })
        _chatbot?: Record<string, any>,
        @PaginationQueryFilterInEnum('status', undefined, ENUM_FOLLOWUP_STATUS)
        _status?: Record<string, any>
    ): Promise<IResponsePaging<FollowupAdminListResponseDto>> {
        // Both filters land on `chatbot`, so merge them instead of spreading.
        const chatbot = { ..._workspace?.chatbot, ..._chatbot?.chatbot };
        const find: Record<string, any> = {
            ..._search,
            ...(Object.keys(chatbot).length > 0 && { chatbot }),
            ..._status,
        };
        const [followups, total] = await Promise.all([
            this.followupService.findAllForAdmin(find, {
                limit: _limit,
                offset: _offset,
                order: _order,
            }),
            this.followupService.getTotalForAdmin(find),
        ]);
        const totalPage = this.paginationService.totalPage(total, _limit);
        return {
            _pagination: { total, totalPage },
            data: this.followupService.mapAdminList(followups),
        };
    }

    @FollowupAdminCancelDoc()
    @Response('followup.admin.cancel')
    @PolicyAbilityProtected({
        subject: ENUM_POLICY_SUBJECT.CHATBOT,
        action: [ENUM_POLICY_ACTION.READ, ENUM_POLICY_ACTION.UPDATE],
    })
    @PolicyRoleProtected(ENUM_POLICY_ROLE_TYPE.ADMIN)
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Post('/cancel/:followup')
    async cancel(
        @Param('followup', ParseUUIDPipe) id: string
    ): Promise<IResponse<void>> {
        const cancelled = await this.followupService.cancelById(id);
        if (!cancelled) {
            throw new ConflictException({
                statusCode: ENUM_APP_STATUS_CODE_ERROR.UNKNOWN,
                message: 'followup.admin.error.notPending',
            });
        }
        return {};
    }
}
