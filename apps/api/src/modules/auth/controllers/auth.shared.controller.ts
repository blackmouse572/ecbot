import { ENUM_ACTIVITY_ACTION } from '@app/modules/activity/enums/activity.enum';
import { ENUM_POLICY_SUBJECT } from '@app/modules/policy/enums/policy.enum';
import { CloudTasksQueueClient } from '@app/worker/cloud-tasks-queue.client';
import { EntityManager } from '@mikro-orm/postgresql';
import {
    BadRequestException,
    Body,
    Controller,
    ForbiddenException,
    HttpCode,
    HttpStatus,
    InternalServerErrorException,
    Logger,
    Patch,
    Post,
    Req,
    Res,
    UnauthorizedException,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type {
    Request as ExpressRequest,
    Response as ExpressResponse,
} from 'express';
import { uniqueId } from 'lodash';
import { ENUM_APP_STATUS_CODE_ERROR } from 'src/app/enums/app.status-code.enum';
import { MessageService } from 'src/common/message/services/message.service';
import { Response } from 'src/common/response/decorators/response.decorator';
import { IResponse } from 'src/common/response/interfaces/response.interface';
import { ActivityService } from 'src/modules/activity/services/activity.service';
import { ApiKeyProtected } from 'src/modules/api-key/decorators/api-key.decorator';
import {
    AuthJwtAccessProtected,
    AuthJwtPayload,
    AuthJwtRefreshProtected,
    AuthJwtToken,
} from 'src/modules/auth/decorators/auth.jwt.decorator';
import {
    AuthSharedChangePasswordDoc,
    AuthSharedLogoutDoc,
    AuthSharedRefreshDoc,
} from 'src/modules/auth/docs/auth.shared.doc';
import { AuthChangePasswordRequestDto } from 'src/modules/auth/dtos/request/auth.change-password.request.dto';
import { AuthRefreshResponseDto } from 'src/modules/auth/dtos/response/auth.refresh.response.dto';
import {
    IAuthJwtAccessTokenPayload,
    IAuthJwtRefreshTokenPayload,
} from 'src/modules/auth/interfaces/auth.interface';
import { AuthService } from 'src/modules/auth/services/auth.service';
import { ENUM_SEND_EMAIL_PROCESS } from 'src/modules/email/enums/email.enum';
import { ENUM_PASSWORD_HISTORY_TYPE } from 'src/modules/password-history/enums/password-history.enum';
import { PasswordHistoryService } from 'src/modules/password-history/services/password-history.service';
import { ENUM_SESSION_STATUS_CODE_ERROR } from 'src/modules/session/enums/session.status-code.enum';
import { SessionService } from 'src/modules/session/services/session.service';
import { UserProtected } from 'src/modules/user/decorators/user.decorator';
import { ENUM_USER_STATUS } from 'src/modules/user/enums/user.enum';
import { ENUM_USER_STATUS_CODE_ERROR } from 'src/modules/user/enums/user.status-code.enum';
import { UserEntity } from 'src/modules/user/repository/entities/user.entity';
import { UserService } from 'src/modules/user/services/user.service';

@ApiTags('modules.shared.auth')
@Controller({
    version: '1',
    path: '/auth',
})
export class AuthSharedController {
    private readonly logger = new Logger(AuthSharedController.name);

    constructor(
        private readonly em: EntityManager,
        private readonly cloudTasksClient: CloudTasksQueueClient,
        private readonly userService: UserService,
        private readonly authService: AuthService,
        private readonly passwordHistoryService: PasswordHistoryService,
        private readonly sessionService: SessionService,
        private readonly activityService: ActivityService,
        private readonly messageService: MessageService
    ) {}

    @AuthSharedRefreshDoc()
    @Response('auth.refresh')
    @AuthJwtRefreshProtected()
    @ApiKeyProtected()
    @HttpCode(HttpStatus.OK)
    @Post('/refresh')
    async refresh(
        @AuthJwtToken() refreshToken: string,
        @AuthJwtPayload<IAuthJwtRefreshTokenPayload>()
        {
            user: userFromPayload,
            session,
            rememberMe,
        }: IAuthJwtRefreshTokenPayload,
        @Res({ passthrough: true }) res: ExpressResponse
    ): Promise<IResponse<AuthRefreshResponseDto>> {
        const checkActive = await this.sessionService.findLoginSession(session);
        if (!checkActive) {
            throw new UnauthorizedException({
                statusCode: ENUM_SESSION_STATUS_CODE_ERROR.NOT_FOUND,
                message: 'session.error.notFound',
            });
        }

        const user: UserEntity | null = await this.userService.findOneById(
            userFromPayload,
            { populate: ['role', 'country'] }
        );
        if (!user) {
            throw new UnauthorizedException({
                statusCode: ENUM_USER_STATUS_CODE_ERROR.NOT_FOUND,
                message: 'user.error.notFound',
            });
        } else if (user.status === ENUM_USER_STATUS.BLOCKED) {
            throw new ForbiddenException({
                statusCode: ENUM_USER_STATUS_CODE_ERROR.BLOCKED_FORBIDDEN,
                message: 'user.error.blocked',
            });
        } else if (user.status !== ENUM_USER_STATUS.ACTIVE) {
            throw new ForbiddenException({
                statusCode: ENUM_USER_STATUS_CODE_ERROR.INACTIVE_FORBIDDEN,
                message: 'user.error.inactive',
            });
        }

        const token = this.authService.refreshToken(user, refreshToken);
        this.authService.setRefreshTokenCookie(
            res,
            token.refreshToken,
            rememberMe
        );

        return {
            data: token,
        };
    }

    // Idempotent by design: no @AuthJwtAccessProtected, since a user logging
    // out with an already-expired access token must still be able to end
    // their session. The refresh cookie (not the access token) is the source
    // of truth for which session to revoke.
    @AuthSharedLogoutDoc()
    @Response('auth.logout')
    @ApiKeyProtected()
    @HttpCode(HttpStatus.OK)
    @Post('/logout')
    async logout(
        @Req() req: ExpressRequest,
        @Res({ passthrough: true }) res: ExpressResponse
    ): Promise<void> {
        const refreshToken = req.cookies?.['refreshToken'] as
            string | undefined;

        if (refreshToken) {
            const payload =
                this.authService.verifyRefreshTokenAllowExpired(refreshToken);

            if (payload?.session) {
                try {
                    const session = await this.sessionService.findOneById(
                        payload.session
                    );
                    if (session) {
                        await this.sessionService.updateRevoke(session);
                    }
                } catch (err: unknown) {
                    this.logger.warn(
                        `Logout: failed to revoke session [${payload.session}] (non-fatal): ${(err as Error)?.message}`
                    );
                }
            }
        }

        this.authService.clearRefreshTokenCookie(res);
    }

    @AuthSharedChangePasswordDoc()
    @Response('auth.changePassword')
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Patch('/change-password')
    async changePassword(
        @Body() body: AuthChangePasswordRequestDto,
        @AuthJwtPayload<IAuthJwtAccessTokenPayload>('user')
        userFromPayload: string
    ): Promise<void> {
        let user = await this.userService.findOneById(userFromPayload);

        const passwordAttempt: boolean = this.authService.getPasswordAttempt();
        const passwordMaxAttempt: number =
            this.authService.getPasswordMaxAttempt();
        if (passwordAttempt && user.passwordAttempt >= passwordMaxAttempt) {
            throw new ForbiddenException({
                statusCode: ENUM_USER_STATUS_CODE_ERROR.PASSWORD_ATTEMPT_MAX,
                message: 'auth.error.passwordAttemptMax',
            });
        }

        const matchPassword = await this.authService.validateUser(
            body.oldPassword,
            user.password
        );
        if (!matchPassword) {
            await this.userService.increasePasswordAttempt(user);

            throw new BadRequestException({
                statusCode: ENUM_USER_STATUS_CODE_ERROR.PASSWORD_NOT_MATCH,
                message: 'auth.error.passwordNotMatch',
            });
        }

        await this.userService.resetPasswordAttempt(user);

        const password = await this.authService.createPassword(
            body.newPassword
        );
        const checkPassword =
            await this.passwordHistoryService.findOneUsedByUser(
                user.id,
                body.newPassword
            );
        if (checkPassword) {
            const passwordPeriod =
                await this.passwordHistoryService.getPasswordPeriod();
            throw new BadRequestException({
                statusCode: ENUM_USER_STATUS_CODE_ERROR.PASSWORD_MUST_NEW,
                message: 'auth.error.passwordMustNew',
                _metadata: {
                    customProperty: {
                        messageProperties: {
                            period: passwordPeriod,
                        },
                    },
                },
            });
        }

        const session = this.em.fork();
        await session.begin();

        try {
            user = await this.userService.updatePassword(user, password, {
                em: session,
            });

            await this.passwordHistoryService.createByUser(
                user,
                {
                    type: ENUM_PASSWORD_HISTORY_TYPE.CHANGE,
                },
                { em: session }
            );
            await this.activityService.createByUser(
                user,
                {
                    action: ENUM_ACTIVITY_ACTION.UPDATE,
                    subject: ENUM_POLICY_SUBJECT.USER,
                },
                { em: session }
            );
            await this.sessionService.updateManyRevokeByUser(user.id, {
                em: session,
            });

            await session.commit();

            await this.cloudTasksClient
                .enqueue(
                    'email',
                    ENUM_SEND_EMAIL_PROCESS.CHANGE_PASSWORD,
                    { send: { email: user.email, name: user.name } },
                    {
                        taskName: `${ENUM_SEND_EMAIL_PROCESS.CHANGE_PASSWORD}-${user.id}-${uniqueId('CP')}`,
                    }
                )
                .catch(err => {
                    this.logger.warn(
                        `Email queue failed after change-password for user [${user.id}] job [${ENUM_SEND_EMAIL_PROCESS.CHANGE_PASSWORD}] (non-fatal): ${(err as Error)?.message}`
                    );
                });
        } catch (err: unknown) {
            try {
                await session.rollback();
            } catch {
                /* ignore rollback error */
            }
            throw new InternalServerErrorException({
                statusCode: ENUM_APP_STATUS_CODE_ERROR.UNKNOWN,
                message: 'http.serverError.internalServerError',
                _error: err,
            });
        }
    }
}
