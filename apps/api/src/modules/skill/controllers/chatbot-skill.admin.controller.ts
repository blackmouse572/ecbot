import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import {
    PaginationQuery,
    PaginationQueryFilterEqual,
    PaginationQueryFilterInBoolean,
} from 'src/common/pagination/decorators/pagination.decorator';
import { PaginationListDto } from 'src/common/pagination/dtos/pagination.list.dto';
import { ENUM_PAGINATION_ORDER_DIRECTION_TYPE } from 'src/common/pagination/enums/pagination.enum';
import { PaginationService } from 'src/common/pagination/services/pagination.service';
import { ResponsePaging } from 'src/common/response/decorators/response.decorator';
import { IResponsePaging } from 'src/common/response/interfaces/response.interface';
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
import { CHATBOT_SKILL_ADMIN_AVAILABLE_SEARCH } from '../constants/skill.constant';
import { ChatbotSkillAdminListDoc } from '../docs/chatbot-skill.admin.doc';
import { ChatbotSkillAdminListResponseDto } from '../dtos/response/chatbot-skill.admin-list.response.dto';
import { ChatbotSkillService } from '../services/chatbot-skill.service';

/** Admins see which agent uses which skill; links are edited in the app. */
@ApiTags('modules.admin.chatbot-skill')
@Controller({
    version: '1',
    path: '/chatbot-skill',
})
export class ChatbotSkillAdminController {
    constructor(
        private readonly chatbotSkillService: ChatbotSkillService,
        private readonly paginationService: PaginationService
    ) {}

    @ChatbotSkillAdminListDoc()
    @ResponsePaging('skill.chatbotSkill.list')
    @PolicyAbilityProtected({
        subject: ENUM_POLICY_SUBJECT.SKILL,
        action: [ENUM_POLICY_ACTION.READ],
    })
    @PolicyRoleProtected(ENUM_POLICY_ROLE_TYPE.ADMIN)
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Get('/list')
    async list(
        @PaginationQuery({
            availableSearch: CHATBOT_SKILL_ADMIN_AVAILABLE_SEARCH,
            availableOrderBy: ['createdAt'],
            defaultOrderBy: 'createdAt',
            defaultOrderDirection: ENUM_PAGINATION_ORDER_DIRECTION_TYPE.DESC,
        })
        { _search, _limit, _offset, _order }: PaginationListDto,
        @PaginationQueryFilterEqual('chatbot.workspace', {
            queryField: 'workspace',
        })
        _workspace?: Record<string, any>,
        @PaginationQueryFilterEqual('chatbot.id', { queryField: 'chatbot' })
        _chatbot?: Record<string, any>,
        @PaginationQueryFilterEqual('skill.id', { queryField: 'skill' })
        _skill?: Record<string, any>,
        @PaginationQueryFilterInBoolean('enabled', [true, false])
        _enabled?: Record<string, any>
    ): Promise<IResponsePaging<ChatbotSkillAdminListResponseDto>> {
        // Both filters land on `chatbot`, so merge them instead of spreading.
        const chatbot = { ..._workspace?.chatbot, ..._chatbot?.chatbot };
        const find: Record<string, any> = {
            ..._search,
            ...(Object.keys(chatbot).length > 0 && { chatbot }),
            ..._skill,
            ..._enabled,
        };
        const options = { limit: _limit, offset: _offset, order: _order };
        const [rows, total] = await Promise.all([
            this.chatbotSkillService.findAllForAdmin(find, options),
            this.chatbotSkillService.getTotalForAdmin(find),
        ]);
        const totalPage = this.paginationService.totalPage(total, _limit);
        return {
            _pagination: { total, totalPage },
            data: this.chatbotSkillService.mapAdminList(rows),
        };
    }
}
