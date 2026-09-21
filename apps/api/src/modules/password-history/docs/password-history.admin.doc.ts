import { applyDecorators } from '@nestjs/common';
import {
    Doc,
    DocAuth,
    DocGuard,
    DocRequest,
    DocResponsePaging,
} from 'src/common/doc/decorators/doc.decorator';
import { PasswordHistoryDocQueryFilters } from 'src/modules/password-history/constants/password-history.doc.constant';
import { PasswordHistoryAdminListResponseDto } from 'src/modules/password-history/dtos/response/password-history.admin-list.response.dto';
import { PasswordHistoryListResponseDto } from 'src/modules/password-history/dtos/response/password-history.list.response.dto';
import { UserDocParamsId } from 'src/modules/user/constants/user.doc.constant';

export function PasswordHistoryAdminListDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'get all user password histories',
        }),
        DocRequest({
            params: UserDocParamsId,
        }),
        DocAuth({
            xApiKey: true,
            jwtAccessToken: true,
        }),
        DocGuard({ role: true, policy: true }),
        DocResponsePaging<PasswordHistoryListResponseDto>(
            'passwordHistory.list',
            {
                dto: PasswordHistoryListResponseDto,
            }
        )
    );
}

export function PasswordHistoryAdminGlobalListDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'get all password histories across users',
        }),
        DocRequest({
            queries: [...PasswordHistoryDocQueryFilters],
        }),
        DocAuth({
            xApiKey: true,
            jwtAccessToken: true,
        }),
        DocGuard({ role: true, policy: true }),
        DocResponsePaging<PasswordHistoryAdminListResponseDto>(
            'passwordHistory.list',
            {
                dto: PasswordHistoryAdminListResponseDto,
            }
        )
    );
}
