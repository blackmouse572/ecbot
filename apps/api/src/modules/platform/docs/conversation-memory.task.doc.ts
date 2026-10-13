import { applyDecorators } from '@nestjs/common';
import {
    Doc,
    DocAuth,
    DocRequest,
    DocResponse,
} from 'src/common/doc/decorators/doc.decorator';
import { ENUM_DOC_REQUEST_BODY_TYPE } from 'src/common/doc/enums/doc.enum';
import { ConversationMemoryTaskDto } from '../dtos/conversation-memory.task.dto';

export function ConversationMemoryTaskHandleDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary:
                'Handle a queued conversation summary job (Cloud Tasks callback)',
            description:
                'Internal back-channel: Cloud Tasks POSTs here after CloudTasksQueueClient.enqueue() queues the messages that left the history window of a Turn. Not called by any client app.',
        }),
        DocRequest({
            bodyType: ENUM_DOC_REQUEST_BODY_TYPE.JSON,
            dto: ConversationMemoryTaskDto,
        }),
        DocAuth({ xApiKey: true }),
        DocResponse('conversationMemory.task.processed')
    );
}
