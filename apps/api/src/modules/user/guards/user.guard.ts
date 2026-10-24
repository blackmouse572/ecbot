import {
    USER_GUARD_CACHE_MAX_ENTRIES,
    USER_GUARD_CACHE_TTL_MS,
    USER_GUARD_EMAIL_VERIFIED_META_KEY,
} from '@app/modules/user/constants/user.constant';
import {
    CanActivate,
    ExecutionContext,
    ForbiddenException,
    Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IRequestApp } from 'src/common/request/interfaces/request.interface';
import { TtlCache } from 'src/common/utils/ttl-cache.util';
import { AuthService } from 'src/modules/auth/services/auth.service';
import { ENUM_ROLE_STATUS_CODE_ERROR } from 'src/modules/role/enums/role.status-code.enum';
import { ENUM_USER_STATUS } from 'src/modules/user/enums/user.enum';
import { ENUM_USER_STATUS_CODE_ERROR } from 'src/modules/user/enums/user.status-code.enum';
import { UserEntity } from 'src/modules/user/repository/entities/user.entity';
import { UserService } from 'src/modules/user/services/user.service';

@Injectable()
export class UserGuard implements CanActivate {
    // Read-only snapshot for the guards that follow; never persisted.
    private readonly cache = new TtlCache<UserEntity>(
        USER_GUARD_CACHE_TTL_MS,
        USER_GUARD_CACHE_MAX_ENTRIES
    );

    constructor(
        private readonly reflector: Reflector,
        private readonly userService: UserService,
        private readonly authService: AuthService
    ) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const emailVerified =
            this.reflector.get<boolean[]>(
                USER_GUARD_EMAIL_VERIFIED_META_KEY,
                context.getHandler()
            ) || [];

        const request = context.switchToHttp().getRequest<IRequestApp>();
        const { user, impersonatedBy } = request.user;

        const cached = this.cache.get(user);
        const userWithRole =
            cached ??
            (await this.userService.findOneWithRoleAndCountryById(user));

        if (!userWithRole) {
            throw new ForbiddenException({
                statusCode: ENUM_USER_STATUS_CODE_ERROR.NOT_FOUND,
                message: 'user.error.notFound',
            });
        } else if (userWithRole.status !== ENUM_USER_STATUS.ACTIVE) {
            throw new ForbiddenException({
                statusCode: ENUM_USER_STATUS_CODE_ERROR.INACTIVE_FORBIDDEN,
                message: 'user.error.inactive',
            });
        } else if (!userWithRole.role.isActive) {
            throw new ForbiddenException({
                statusCode: ENUM_ROLE_STATUS_CODE_ERROR.INACTIVE_FORBIDDEN,
                message: 'role.error.inactive',
            });
        }

        // An impersonating admin never uses the user's password or inbox, so
        // their expiry and verification must not lock support out.
        const checkPasswordExpired: boolean =
            !impersonatedBy &&
            this.authService.checkPasswordExpired(userWithRole.passwordExpired);
        if (checkPasswordExpired) {
            throw new ForbiddenException({
                statusCode: ENUM_USER_STATUS_CODE_ERROR.PASSWORD_EXPIRED,
                message: 'auth.error.passwordExpired',
            });
        } else if (
            !impersonatedBy &&
            emailVerified.includes(true) &&
            userWithRole.verification.email !== true
        ) {
            throw new ForbiddenException({
                statusCode: ENUM_USER_STATUS_CODE_ERROR.EMAIL_NOT_VERIFIED,
                message: 'user.error.emailNotVerified',
            });
        }

        // Only a fresh read starts the clock, so a busy user is still
        // reloaded at least every USER_GUARD_CACHE_TTL_MS.
        if (!cached) this.cache.set(user, userWithRole);
        request.__user = userWithRole;

        return true;
    }
}
