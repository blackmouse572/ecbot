import { applyDecorators } from '@nestjs/common';
import {
    Doc,
    DocAuth,
    DocRequest,
    DocResponse,
} from 'src/common/doc/decorators/doc.decorator';
import { ENUM_DOC_REQUEST_BODY_TYPE } from 'src/common/doc/enums/doc.enum';
import { ReplyMissedTaskDto } from '../dtos/reply-missed.task.dto';

export function ReplyMissedTaskHandleDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'Check one inbound message for a missing bot reply',
            description:
                'Internal back-channel: Cloud Tasks POSTs here five minutes after an inbound message was saved. Logs a `reply.missed` warning when the customer got no reply. Not called by any client app.',
        }),
        DocRequest({
            bodyType: ENUM_DOC_REQUEST_BODY_TYPE.JSON,
            dto: ReplyMissedTaskDto,
        }),
        DocAuth({ xApiKey: true }),
        DocResponse('replyMissed.task.processed')
    );
}
