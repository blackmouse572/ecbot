import { applyDecorators } from '@nestjs/common';
import {
    Doc,
    DocAuth,
    DocGuard,
    DocRequest,
    DocResponsePaging,
} from 'src/common/doc/decorators/doc.decorator';
import { ActivityAdminDocQueryFilters } from 'src/modules/activity/constants/activity.doc.constant';
import { ActivityAdminListResponseDto } from 'src/modules/activity/dtos/response/activity.admin-list.response.dto';
import { ActivityListResponseDto } from 'src/modules/activity/dtos/response/activity.list.response.dto';
import { ENUM_ACTIVITY_ACTION } from 'src/modules/activity/enums/activity.enum';
import { ENUM_POLICY_SUBJECT } from 'src/modules/policy/enums/policy.enum';
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
                    example: Object.values(ENUM_ACTIVITY_ACTION).join(','),
                    description: "value with ',' delimiter",
                },
                {
                    name: 'subject',
                    type: String,
                    required: false,
                    example: Object.values(ENUM_POLICY_SUBJECT).join(','),
                    description: "value with ',' delimiter",
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

export function ActivityAdminGlobalListDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'get all activities across users and workspaces',
        }),
        DocRequest({
            queries: [...ActivityAdminDocQueryFilters],
        }),
        DocAuth({
            xApiKey: true,
            jwtAccessToken: true,
        }),
        DocGuard({ role: true, policy: true }),
        DocResponsePaging<ActivityAdminListResponseDto>('activity.list', {
            dto: ActivityAdminListResponseDto,
        })
    );
}
