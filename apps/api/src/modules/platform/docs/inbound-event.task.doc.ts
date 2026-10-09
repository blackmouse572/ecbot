import { applyDecorators } from '@nestjs/common';
import {
    Doc,
    DocAuth,
    DocRequest,
    DocResponse,
} from 'src/common/doc/decorators/doc.decorator';
import { ENUM_DOC_REQUEST_BODY_TYPE } from 'src/common/doc/enums/doc.enum';
import { InboundEventTaskDto } from '../dtos/inbound-event.task.dto';

export function InboundEventTaskHandleDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary:
                'Handle a queued inbound platform event (Cloud Tasks callback)',
            description:
                'Internal back-channel: Cloud Tasks POSTs here after InboundInboxService.accept() enqueues an inbound webhook event, and the Turn pipeline runs inside this request. Not called by any client app.',
        }),
        DocRequest({
            bodyType: ENUM_DOC_REQUEST_BODY_TYPE.JSON,
            dto: InboundEventTaskDto,
        }),
        DocAuth({ xApiKey: true }),
        DocResponse('inboundEvent.task.processed')
    );
}
