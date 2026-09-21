import { applyDecorators } from '@nestjs/common';
import {
    Doc,
    DocAuth,
    DocRequest,
    DocResponse,
} from 'src/common/doc/decorators/doc.decorator';
import { ENUM_DOC_REQUEST_BODY_TYPE } from 'src/common/doc/enums/doc.enum';
import { EmailTaskDto } from 'src/modules/email/dtos/email.task.dto';

export function EmailTaskHandleDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'Handle a queued email job (Cloud Tasks callback)',
            description:
                'Internal back-channel: Cloud Tasks POSTs here after CloudTasksQueueClient.enqueue() schedules an email job. Not called by any client app.',
        }),
        DocRequest({
            bodyType: ENUM_DOC_REQUEST_BODY_TYPE.JSON,
            dto: EmailTaskDto,
        }),
        DocAuth({
            xApiKey: true,
        }),
        DocResponse('email.task.processed')
    );
}
