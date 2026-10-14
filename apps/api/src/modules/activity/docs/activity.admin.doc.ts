import { applyDecorators } from '@nestjs/common';
import {
    Doc,
    DocAuth,
    DocGuard,
    DocRequest,
    DocResponsePaging,
} from 'src/common/doc/decorators/doc.decorator';
import { ActivityListResponseDto } from 'src/modules/activity/dtos/response/activity.list.response.dto';
import { UserDocParamsId } from 'src/modules/user/constants/user.doc.constant';

export function ActivityAdminListDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'get all user activities',
        }),
        DocRequest({
            params: UserDocParamsId,
            queries: [
                {
                    name: 'action',
                    type: String,
                    required: false,
                },
                {
                    name: 'subject',
                    type: String,
                    required: false,
                },
            ],
        }),
        DocAuth({
            xApiKey: true,
            jwtAccessToken: true,
        }),
        DocGuard({ role: true, policy: true }),
        DocResponsePaging<ActivityListResponseDto>('activity.list', {
            dto: ActivityListResponseDto,
        })
    );
}
