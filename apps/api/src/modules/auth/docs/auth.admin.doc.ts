import { AuthAdminUpdatePasswordResponseDto } from 'src/modules/auth/dtos/response/auth.admin-update-password.response.dto';
import { AuthAdminUpdatePasswordRequestDto } from 'src/modules/auth/dtos/request/auth.admin-update-password.request.dto';
import { applyDecorators } from '@nestjs/common';
import { ENUM_DOC_REQUEST_BODY_TYPE } from 'src/common/doc/enums/doc.enum';
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
            summary:
                "admin set a user's password: typed, or generated as a temporary one; signs out every session",
        }),
        DocRequest({
            params: UserDocParamsId,
            bodyType: ENUM_DOC_REQUEST_BODY_TYPE.JSON,
            dto: AuthAdminUpdatePasswordRequestDto,
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
