import {
    Doc,
    DocAuth,
    DocGuard,
    DocRequest,
    DocResponse,
    DocResponsePaging,
} from '@app/common/doc/decorators/doc.decorator';
import { applyDecorators } from '@nestjs/common';
import {
    FollowupAdminDocParamsId,
    FollowupAdminDocQueryFilters,
} from '../constants/followup.doc.constant';
import { FollowupAdminListResponseDto } from '../dtos/response/followup.admin-list.response.dto';

export function FollowupAdminListDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'list follow-ups across every workspace, latest first',
        }),
        DocRequest({ queries: [...FollowupAdminDocQueryFilters] }),
        DocAuth({ xApiKey: true, jwtAccessToken: true }),
        DocGuard({ role: true, policy: true }),
        DocResponsePaging<FollowupAdminListResponseDto>('followup.admin.list', {
            dto: FollowupAdminListResponseDto,
        })
    );
}

export function FollowupAdminCancelDoc(): MethodDecorator {
    return applyDecorators(
        Doc({ summary: 'cancel a pending follow-up in any workspace' }),
        DocRequest({ params: [...FollowupAdminDocParamsId] }),
        DocAuth({ xApiKey: true, jwtAccessToken: true }),
        DocGuard({ role: true, policy: true }),
        DocResponse('followup.admin.cancel')
    );
}
