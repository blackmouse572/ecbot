import { applyDecorators } from '@nestjs/common';
import {
    Doc,
    DocAuth,
    DocRequest,
    DocResponse,
} from 'src/common/doc/decorators/doc.decorator';
import { ENUM_DOC_REQUEST_BODY_TYPE } from 'src/common/doc/enums/doc.enum';
import { FollowupTaskDto } from '../dtos/followup.task.dto';

export function FollowupTaskHandleDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'Handle a queued follow-up job (Cloud Tasks callback)',
            description:
                'Internal back-channel: Cloud Tasks POSTs here after CloudTasksQueueClient.enqueue() schedules a follow-up job. Not called by any client app.',
        }),
        DocRequest({
            bodyType: ENUM_DOC_REQUEST_BODY_TYPE.JSON,
            dto: FollowupTaskDto,
        }),
        DocAuth({ xApiKey: true }),
        DocResponse('followup.task.processed')
    );
}
