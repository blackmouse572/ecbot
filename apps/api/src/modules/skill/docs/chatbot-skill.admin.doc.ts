import {
    Doc,
    DocAuth,
    DocGuard,
    DocRequest,
    DocResponsePaging,
} from '@app/common/doc/decorators/doc.decorator';
import { applyDecorators } from '@nestjs/common';
import { ChatbotSkillAdminDocQueryFilters } from '../constants/skill.doc.constant';
import { ChatbotSkillAdminListResponseDto } from '../dtos/response/chatbot-skill.admin-list.response.dto';

export function ChatbotSkillAdminListDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary:
                'list which agent uses which skill, across every workspace',
        }),
        DocRequest({ queries: [...ChatbotSkillAdminDocQueryFilters] }),
        DocAuth({ xApiKey: true, jwtAccessToken: true }),
        DocGuard({ role: true, policy: true }),
        DocResponsePaging<ChatbotSkillAdminListResponseDto>(
            'skill.chatbotSkill.list',
            { dto: ChatbotSkillAdminListResponseDto }
        )
    );
}
