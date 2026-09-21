import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { isUUID } from 'class-validator';
import { ENUM_AUTH_STATUS_CODE_ERROR } from 'src/modules/auth/enums/auth.status-code.enum';
import { IAuthJwtAccessTokenPayload } from 'src/modules/auth/interfaces/auth.interface';

@Injectable()
export class AuthJwtAccessGuard extends AuthGuard('jwtAccess') {
    private readonly logger = new Logger(AuthJwtAccessGuard.name);
    handleRequest<T = IAuthJwtAccessTokenPayload>(
        err: Error,
        user: T,
        info: Error
    ): T {
        if (err || !user) {
            this.logger.error(
                'JWT Access Token Unauthorized: ',
                err?.message || info?.message,
                {
                    user,
                    info,
                }
            );
            throw new UnauthorizedException({
                statusCode: ENUM_AUTH_STATUS_CODE_ERROR.JWT_ACCESS_TOKEN,
                message: 'auth.error.accessTokenUnauthorized',
                _error: err ? err.message : info?.message,
            });
        }

        const { sub } = user as IAuthJwtAccessTokenPayload;
        if (!sub) {
            this.logger.error('JWT Access Token Unauthorized: Missing sub');
            throw new UnauthorizedException({
                statusCode: ENUM_AUTH_STATUS_CODE_ERROR.JWT_ACCESS_TOKEN,
                message: 'auth.error.accessTokenUnauthorized',
            });
        } else if (!isUUID(sub)) {
            this.logger.error(
                'JWT Access Token Unauthorized: Invalid sub format',
                { sub }
            );
            throw new UnauthorizedException({
                statusCode: ENUM_AUTH_STATUS_CODE_ERROR.JWT_ACCESS_TOKEN,
                message: 'auth.error.accessTokenUnauthorized',
            });
        }

        return user;
    }
}
