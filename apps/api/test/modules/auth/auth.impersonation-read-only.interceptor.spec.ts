import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { of } from 'rxjs';
import { AuthImpersonationReadOnlyInterceptor } from '@app/modules/auth/interceptors/auth.impersonation-read-only.interceptor';
import { AllowImpersonation } from '@app/modules/auth/decorators/auth.impersonation.decorator';
import { ENUM_AUTH_STATUS_CODE_ERROR } from '@app/modules/auth/enums/auth.status-code.enum';

class Handlers {
    list() {}

    @AllowImpersonation()
    end() {}

    deleteAccount() {}
}

describe('AuthImpersonationReadOnlyInterceptor', () => {
    const interceptor = new AuthImpersonationReadOnlyInterceptor(
        new Reflector()
    );
    const next = { handle: jest.fn(() => of('ok')) };

    const ctx = (
        method: string,
        user: Record<string, unknown> | undefined,
        handler: () => void
    ) =>
        ({
            getType: () => 'http',
            getHandler: () => handler,
            getClass: () => Handlers,
            switchToHttp: () => ({ getRequest: () => ({ method, user }) }),
        }) as unknown as ExecutionContext;

    const impersonating = { user: 'u1', impersonatedBy: 'admin-1' };
    const h = new Handlers();

    beforeEach(() => next.handle.mockClear());

    it.each(['GET', 'HEAD', 'OPTIONS', 'get'])(
        'lets an impersonation token read (%s)',
        method => {
            interceptor.intercept(
                ctx(method, impersonating, h.list),
                next as never
            );
            expect(next.handle).toHaveBeenCalled();
        }
    );

    it.each(['POST', 'PUT', 'PATCH', 'DELETE'])(
        'refuses %s with an impersonation token (e.g. deleting the account)',
        method => {
            expect(() =>
                interceptor.intercept(
                    ctx(method, impersonating, h.deleteAccount),
                    next as never
                )
            ).toThrow(ForbiddenException);
            expect(next.handle).not.toHaveBeenCalled();
        }
    );

    it('uses a dedicated status code and message', () => {
        try {
            interceptor.intercept(
                ctx('DELETE', impersonating, h.deleteAccount),
                next as never
            );
            fail('should have thrown');
        } catch (e) {
            expect((e as ForbiddenException).getResponse()).toMatchObject({
                statusCode: ENUM_AUTH_STATUS_CODE_ERROR.IMPERSONATE_READ_ONLY,
                message: 'auth.error.impersonateReadOnly',
            });
        }
    });

    it('lets handlers that opted in write (ending / renewing the session)', () => {
        interceptor.intercept(ctx('POST', impersonating, h.end), next as never);
        expect(next.handle).toHaveBeenCalled();
    });

    it('does not restrict normal tokens or unauthenticated routes', () => {
        interceptor.intercept(
            ctx('DELETE', { user: 'u1' }, h.deleteAccount),
            next as never
        );
        interceptor.intercept(
            ctx('POST', undefined, h.deleteAccount),
            next as never
        );
        expect(next.handle).toHaveBeenCalledTimes(2);
    });
});
