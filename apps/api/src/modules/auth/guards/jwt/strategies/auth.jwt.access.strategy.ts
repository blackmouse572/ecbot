import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Algorithm } from 'jsonwebtoken';
import { passportJwtSecret } from 'jwks-rsa';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ENUM_AUTH_STATUS_CODE_ERROR } from 'src/modules/auth/enums/auth.status-code.enum';
import { IAuthJwtAccessTokenPayload } from 'src/modules/auth/interfaces/auth.interface';
import { SessionService } from 'src/modules/session/services/session.service';

@Injectable()
export class AuthJwtAccessStrategy extends PassportStrategy(
    Strategy,
    'jwtAccess'
) {
    constructor(
        private readonly configService: ConfigService,
        private readonly sessionService: SessionService
    ) {
        super({
            jwtFromRequest: ExtractJwt.fromAuthHeaderWithScheme(
                configService.get<string>('auth.jwt.prefix')
            ),
            ignoreExpiration: false,
            jsonWebTokenOptions: {
                ignoreNotBefore: true,
                audience: configService.get<string>('auth.jwt.audience'),
                issuer: configService.get<string>('auth.jwt.issuer'),
            },
            secretOrKeyProvider: passportJwtSecret({
                cache: true,
                rateLimit: true,
                jwksRequestsPerMinute: 5,
                jwksUri: configService.get<string>('auth.jwt.jwksUri'),
            }),
            algorithms: [configService.get<Algorithm>('auth.jwt.algorithm')],
        });
    }

    async validate(
        data: IAuthJwtAccessTokenPayload
    ): Promise<IAuthJwtAccessTokenPayload> {
        // Reject tokens whose session was revoked (logout, admin revoke,
        // password reset) even though the JWT itself is still cryptographically
        // valid and unexpired — the Redis login session is the source of truth.
        const activeSession = await this.sessionService.findLoginSession(
            data.session
        );
        if (!activeSession) {
            throw new UnauthorizedException({
                statusCode: ENUM_AUTH_STATUS_CODE_ERROR.JWT_ACCESS_TOKEN,
                message: 'auth.error.accessTokenUnauthorized',
            });
        }

        // Record session activity without blocking the request (throttled write).
        // Self-defending catch so this hot path never rejects even if the callee
        // is later refactored to throw.
        void this.sessionService
            .touchLastActive(data.session)
            .catch(() => undefined);

        return data;
    }
}
