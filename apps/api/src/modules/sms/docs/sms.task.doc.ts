import { applyDecorators } from '@nestjs/common';
import {
    Doc,
    DocAuth,
    DocRequest,
    DocResponse,
} from 'src/common/doc/decorators/doc.decorator';
import { ENUM_DOC_REQUEST_BODY_TYPE } from 'src/common/doc/enums/doc.enum';
import { SmsTaskDto } from 'src/modules/sms/dtos/sms.task.dto';

export function SmsTaskHandleDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'Handle a queued SMS job (Cloud Tasks callback)',
            description:
                'Internal back-channel: Cloud Tasks POSTs here after CloudTasksQueueClient.enqueue() schedules an SMS job. Not called by any client app.',
        }),
        DocRequest({
            bodyType: ENUM_DOC_REQUEST_BODY_TYPE.JSON,
            dto: SmsTaskDto,
        }),
        DocAuth({
            xApiKey: true,
        }),
        DocResponse('sms.task.processed')
    );
}
