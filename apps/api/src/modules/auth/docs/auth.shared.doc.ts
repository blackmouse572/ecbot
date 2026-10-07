import { applyDecorators } from '@nestjs/common';
import {
    Doc,
    DocAuth,
    DocRequest,
    DocResponse,
} from 'src/common/doc/decorators/doc.decorator';
import { ENUM_DOC_REQUEST_BODY_TYPE } from 'src/common/doc/enums/doc.enum';
import { AuthImpersonateRefreshResponseDto } from 'src/modules/auth/dtos/response/auth.impersonate-refresh.response.dto';
import { AuthChangePasswordRequestDto } from 'src/modules/auth/dtos/request/auth.change-password.request.dto';
import { AuthRefreshResponseDto } from 'src/modules/auth/dtos/response/auth.refresh.response.dto';

export function AuthSharedRefreshDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'refresh a token',
        }),
        DocAuth({
            xApiKey: true,
            jwtRefreshToken: true,
        }),
        DocResponse<AuthRefreshResponseDto>('auth.refresh', {
            dto: AuthRefreshResponseDto,
        })
    );
}

export function AuthSharedLogoutDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'end the current session',
        }),
        DocAuth({
            xApiKey: true,
        }),
        DocResponse('auth.logout')
    );
}

export function AuthSharedChangePasswordDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'change password',
        }),
        DocAuth({
            xApiKey: true,
            jwtAccessToken: true,
        }),
        DocRequest({
            bodyType: ENUM_DOC_REQUEST_BODY_TYPE.JSON,
            dto: AuthChangePasswordRequestDto,
        }),
        DocResponse('auth.changePassword')
    );
}

export function AuthSharedImpersonateEndDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'end an impersonation session',
        }),
        DocAuth({
            xApiKey: true,
            jwtAccessToken: true,
        }),
        DocResponse('auth.impersonateEnd')
    );
}

export function AuthSharedImpersonateRefreshDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'renew an impersonation access token',
        }),
        DocAuth({
            xApiKey: true,
            jwtAccessToken: true,
        }),
        DocResponse<AuthImpersonateRefreshResponseDto>(
            'auth.impersonateRefresh',
            { dto: AuthImpersonateRefreshResponseDto }
        )
    );
}
