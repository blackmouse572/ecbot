import { applyDecorators } from '@nestjs/common';
import {
    Doc,
    DocAuth,
    DocRequest,
    DocResponse,
} from 'src/common/doc/decorators/doc.decorator';
import { ENUM_DOC_REQUEST_BODY_TYPE } from 'src/common/doc/enums/doc.enum';
import { CustomerTagClassifierTaskDto } from '../dtos/customer-tag-classifier.task.dto';

export function CustomerTagClassifierTaskHandleDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary:
                'Handle a queued customer tag classifier job (Cloud Tasks callback)',
            description:
                'Internal back-channel: Cloud Tasks POSTs here after CustomerTagClassifierService schedules a classifier task. Not called by any client app.',
        }),
        DocRequest({
            bodyType: ENUM_DOC_REQUEST_BODY_TYPE.JSON,
            dto: CustomerTagClassifierTaskDto,
        }),
        DocAuth({ xApiKey: true }),
        DocResponse('customerTagClassifier.task.processed')
    );
}
