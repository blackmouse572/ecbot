import { EntityManager } from '@mikro-orm/postgresql';
import { Injectable } from '@nestjs/common';
import type { Response as ExpressResponse } from 'express';
import { AuthLoginResponseDto } from 'src/modules/auth/dtos/response/auth.login.response.dto';
import { AuthService } from 'src/modules/auth/services/auth.service';
import { SessionService } from 'src/modules/session/services/session.service';
import { UserEntity } from 'src/modules/user/repository/entities/user.entity';
import { IRequestApp } from 'src/common/request/interfaces/request.interface';

/**
 * Opens a login session once the caller has checked the user may log in:
 * session row, login session, tokens and refresh cookie. Shared by
 * credential login and sign-in after email verification, so the two cannot
 * drift apart.
 */
@Injectable()
export class AuthLoginSessionService {
    constructor(
        private readonly em: EntityManager,
        private readonly authService: AuthService,
        private readonly sessionService: SessionService
    ) {}

    /** Throws when the session cannot be created; nothing is kept then. */
    async open(
        userWithRole: UserEntity,
        request: IRequestApp,
        res: ExpressResponse,
        rememberMe?: boolean
    ): Promise<AuthLoginResponseDto> {
        const databaseSession = this.em.fork();
        await databaseSession.begin();

        let token: AuthLoginResponseDto;
        try {
            const session = await this.sessionService.create(
                request,
                { user: userWithRole.id },
                { em: databaseSession }
            );
            await this.sessionService.setLoginSession(userWithRole, session);
            token = this.authService.createToken(
                userWithRole,
                session.id,
                rememberMe
            );
            this.authService.setRefreshTokenCookie(
                res,
                token.refreshToken,
                rememberMe
            );
            await databaseSession.commit();
        } catch (err: unknown) {
            try {
                await databaseSession.rollback();
            } catch {
                /* ignore rollback error */
            }
            throw err;
        }

        return token;
    }
}
