import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserGuard } from '@app/modules/user/guards/user.guard';
import { ENUM_USER_STATUS } from '@app/modules/user/enums/user.enum';
import type { UserService } from '@app/modules/user/services/user.service';
import type { AuthService } from '@app/modules/auth/services/auth.service';

jest.mock('src/modules/auth/services/auth.service', () => ({
    AuthService: class {},
}));
jest.mock('src/modules/user/services/user.service', () => ({
    UserService: class {},
}));

const activeUser = {
    id: 'user-1',
    status: ENUM_USER_STATUS.ACTIVE,
    role: { isActive: true },
    verification: { email: true },
};

function contextFor(userId: string) {
    const request: Record<string, any> = { user: { user: userId } };
    return {
        request,
        context: {
            switchToHttp: () => ({ getRequest: () => request }),
            getHandler: () => ({}),
        } as unknown as ExecutionContext,
    };
}

function setup(user: Record<string, any> = activeUser) {
    const findOneWithRoleAndCountryById = jest.fn().mockResolvedValue(user);
    const guard = new UserGuard(
        { get: () => undefined } as unknown as Reflector,
        { findOneWithRoleAndCountryById } as unknown as UserService,
        { checkPasswordExpired: () => false } as unknown as AuthService
    );
    return { guard, findOneWithRoleAndCountryById };
}

describe('UserGuard', () => {
    it('loads the user once, then serves it from cache', async () => {
        const { guard, findOneWithRoleAndCountryById } = setup();

        for (let i = 0; i < 3; i++) {
            const { request, context } = contextFor('user-1');
            await expect(guard.canActivate(context)).resolves.toBe(true);
            expect(request.__user).toBe(activeUser);
        }

        expect(findOneWithRoleAndCountryById).toHaveBeenCalledTimes(1);
    });

    it('reloads the user after the ttl even while requests keep coming', async () => {
        jest.useFakeTimers({ now: new Date('2026-10-18T00:00:00Z') });
        const { guard, findOneWithRoleAndCountryById } = setup();

        for (let i = 0; i < 4; i++) {
            await guard.canActivate(contextFor('user-1').context);
            jest.advanceTimersByTime(10_000);
        }
        jest.useRealTimers();

        expect(findOneWithRoleAndCountryById).toHaveBeenCalledTimes(2);
    });

    it('does not cache a user it rejects', async () => {
        const { guard, findOneWithRoleAndCountryById } = setup({
            ...activeUser,
            status: ENUM_USER_STATUS.INACTIVE,
        });

        for (let i = 0; i < 2; i++) {
            await expect(
                guard.canActivate(contextFor('user-1').context)
            ).rejects.toThrow(ForbiddenException);
        }

        expect(findOneWithRoleAndCountryById).toHaveBeenCalledTimes(2);
    });
});
