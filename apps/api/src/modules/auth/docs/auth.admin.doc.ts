import { AuthAdminUpdatePasswordResponseDto } from 'src/modules/auth/dtos/response/auth.admin-update-password.response.dto';
import { applyDecorators } from '@nestjs/common';
import {
    Doc,
    DocAuth,
    DocGuard,
    DocRequest,
    DocResponse,
} from 'src/common/doc/decorators/doc.decorator';
import { UserDocParamsId } from 'src/modules/user/constants/user.doc.constant';

export function AuthAdminUpdatePasswordDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'admin update user password',
        }),
        DocRequest({
            params: UserDocParamsId,
        }),
        DocAuth({
            xApiKey: true,
            jwtAccessToken: true,
        }),
        DocGuard({ role: true, policy: true }),
        DocResponse<AuthAdminUpdatePasswordResponseDto>('auth.updatePassword', {
            dto: AuthAdminUpdatePasswordResponseDto,
        })
    );
}

export function AuthAdminResetMfaDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary:
                "admin turn off a user's MFA: clears the secret and recovery codes and signs out every session",
        }),
        DocRequest({
            params: UserDocParamsId,
        }),
        DocAuth({
            xApiKey: true,
            jwtAccessToken: true,
        }),
        DocGuard({ role: true, policy: true }),
        DocResponse('auth.mfaReset')
    );
}
