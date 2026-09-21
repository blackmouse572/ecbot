import { applyDecorators } from '@nestjs/common';
import {
    Doc,
    DocAuth,
    DocRequest,
    DocResponse,
} from 'src/common/doc/decorators/doc.decorator';
import { ENUM_DOC_REQUEST_BODY_TYPE } from 'src/common/doc/enums/doc.enum';
import { KnowledgeIngestTaskDto } from '../dtos/knowledge-ingest.task.dto';

export function KnowledgeIngestTaskHandleDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary:
                'Handle a queued knowledge ingest job (Cloud Tasks callback)',
            description:
                'Internal back-channel: Cloud Tasks POSTs here after CloudTasksQueueClient.enqueue() schedules a knowledge ingest job. Not called by any client app.',
        }),
        DocRequest({
            bodyType: ENUM_DOC_REQUEST_BODY_TYPE.JSON,
            dto: KnowledgeIngestTaskDto,
        }),
        DocAuth({ xApiKey: true }),
        DocResponse('knowledgeBase.task.processed')
    );
}
