import { applyDecorators } from '@nestjs/common';
import {
    Doc,
    DocAuth,
    DocResponsePaging,
} from 'src/common/doc/decorators/doc.decorator';
import { KnowledgeBaseResponseDto } from '../dtos/response/knowledge-base.response.dto';

export function KnowledgeBaseClientListDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'list the knowledge bases in the credential workspace',
        }),
        DocAuth({ xApiKey: true }),
        DocResponsePaging('knowledgeBase.list', {
            dto: KnowledgeBaseResponseDto,
        })
    );
}
