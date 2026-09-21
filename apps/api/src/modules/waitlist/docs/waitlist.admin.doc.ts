import { applyDecorators } from '@nestjs/common';
import {
    Doc,
    DocAuth,
    DocGuard,
    DocResponsePaging,
} from 'src/common/doc/decorators/doc.decorator';
import { WaitlistListResponseDto } from 'src/modules/waitlist/dtos/response/waitlist.list.response.dto';

export function WaitlistAdminListDoc(): MethodDecorator {
    return applyDecorators(
        Doc({ summary: 'get list of waitlist entries' }),
        DocAuth({ xApiKey: true, jwtAccessToken: true }),
        DocGuard({ role: true, policy: true }),
        DocResponsePaging<WaitlistListResponseDto>('waitlist.list', {
            dto: WaitlistListResponseDto,
        })
    );
}
