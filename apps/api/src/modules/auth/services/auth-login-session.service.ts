import { EntityManager } from '@mikro-orm/postgresql';
import { Injectable, Logger } from '@nestjs/common';
import type { Response as ExpressResponse } from 'express';
import { ENUM_ACTIVITY_ACTION } from 'src/modules/activity/enums/activity.enum';
import { ActivityService } from 'src/modules/activity/services/activity.service';
import { AuthLoginResponseDto } from 'src/modules/auth/dtos/response/auth.login.response.dto';
import { AuthService } from 'src/modules/auth/services/auth.service';
import { ENUM_POLICY_SUBJECT } from 'src/modules/policy/enums/policy.enum';
import { SessionService } from 'src/modules/session/services/session.service';
import { UserEntity } from 'src/modules/user/repository/entities/user.entity';
import { IRequestApp } from 'src/common/request/interfaces/request.interface';

/**
 * Opens a login session once the caller has checked the user may log in:
 * session row, login session, tokens, refresh cookie and the activity
 * entry. Shared by credential login and sign-in after email verification,
 * so the two cannot drift apart.
 */
@Injectable()
export class AuthLoginSessionService {
    private readonly logger = new Logger(AuthLoginSessionService.name);

    constructor(
        private readonly em: EntityManager,
        private readonly authService: AuthService,
        private readonly sessionService: SessionService,
        private readonly activityService: ActivityService
    ) {}

    /** Throws when the session cannot be created; nothing is kept then. */
    async open(
        userWithRole: UserEntity,
        request: IRequestApp,
        res: ExpressResponse,
        rememberMe?: boolean,
        auditMetadata?: Record<string, unknown>
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

        // The session is committed and the cookie set: a failed audit write
        // must not take the token away from the caller.
        await this.activityService
            .createByUser(userWithRole, {
                action: ENUM_ACTIVITY_ACTION.LOGIN,
                subject: ENUM_POLICY_SUBJECT.AUTH,
                // The audit log is append-only, so it keeps ids, not emails.
                metadata: { id: userWithRole.id, ...auditMetadata },
            })
            .catch((err: unknown) =>
                this.logger.warn(
                    `Login activity for user [${userWithRole.id}] not recorded: ${(err as Error)?.message}`
                )
            );
        return token;
    }
}
