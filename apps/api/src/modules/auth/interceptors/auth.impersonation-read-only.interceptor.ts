import {
    CallHandler,
    ExecutionContext,
    ForbiddenException,
    Injectable,
    NestInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import {
    AUTH_ALLOW_IMPERSONATION_META_KEY,
    AUTH_IMPERSONATION_SAFE_METHODS,
} from 'src/modules/auth/constants/auth.impersonation.constant';
import { ENUM_AUTH_STATUS_CODE_ERROR } from 'src/modules/auth/enums/auth.status-code.enum';
import { IAuthJwtAccessTokenPayload } from 'src/modules/auth/interfaces/auth.interface';

/**
 * Makes impersonation read-only. Without this, "user view mode" would be able
 * to do anything the user can (delete the account, revoke their sessions,
 * reset API keys, change billing) and every write would be logged as the user.
 *
 * Runs after the auth guards, so `request.user` is the verified access-token
 * payload: a token carrying `impersonatedBy` may only use safe methods, or a
 * handler that explicitly opts in with @AllowImpersonation().
 */
@Injectable()
export class AuthImpersonationReadOnlyInterceptor implements NestInterceptor {
    constructor(private readonly reflector: Reflector) {}

    intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
        if (context.getType() !== 'http') return next.handle();

        const request = context.switchToHttp().getRequest<{
            method: string;
            user?: Partial<IAuthJwtAccessTokenPayload>;
        }>();
        if (!request.user?.impersonatedBy) return next.handle();
        if (AUTH_IMPERSONATION_SAFE_METHODS.has(request.method.toUpperCase())) {
            return next.handle();
        }

        const allowed = this.reflector.getAllAndOverride<boolean>(
            AUTH_ALLOW_IMPERSONATION_META_KEY,
            [context.getHandler(), context.getClass()]
        );
        if (allowed) return next.handle();

        throw new ForbiddenException({
            statusCode: ENUM_AUTH_STATUS_CODE_ERROR.IMPERSONATE_READ_ONLY,
            message: 'auth.error.impersonateReadOnly',
        });
    }
}
