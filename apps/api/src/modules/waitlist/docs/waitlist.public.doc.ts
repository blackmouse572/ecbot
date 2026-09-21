import { applyDecorators } from '@nestjs/common';
import {
    Doc,
    DocAuth,
    DocRequest,
    DocResponse,
} from 'src/common/doc/decorators/doc.decorator';
import { WaitlistJoinRequestDto } from 'src/modules/waitlist/dtos/request/waitlist.join.request.dto';

export function WaitlistPublicJoinDoc(): MethodDecorator {
    return applyDecorators(
        Doc({ summary: 'join the waitlist' }),
        DocRequest({ dto: WaitlistJoinRequestDto }),
        DocAuth({ xApiKey: true }),
        DocResponse('waitlist.join')
    );
}
