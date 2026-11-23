import {
    Doc,
    DocAuth,
    DocRequest,
    DocResponse,
} from '@app/common/doc/decorators/doc.decorator';
import { ENUM_DOC_REQUEST_BODY_TYPE } from '@app/common/doc/enums/doc.enum';
import { applyDecorators } from '@nestjs/common';
import { MarketingSendTaskDto } from '../dtos/marketing-send.task.dto';

export function MarketingSendTaskHandleDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'Send one marketing offer (Cloud Tasks callback)',
            description:
                'Internal back-channel: Cloud Tasks POSTs here for each customer a marketing send reaches. Not called by any client app.',
        }),
        DocRequest({
            bodyType: ENUM_DOC_REQUEST_BODY_TYPE.JSON,
            dto: MarketingSendTaskDto,
        }),
        DocAuth({ xApiKey: true }),
        DocResponse('marketingSend.task.processed')
    );
}
