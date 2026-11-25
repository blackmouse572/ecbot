import { CloudTasksQueueClient } from '@app/worker/cloud-tasks-queue.client';
import { EntityManager } from '@mikro-orm/postgresql';
import {
    BadRequestException,
    Body,
    Controller,
    ForbiddenException,
    Headers,
    HttpCode,
    HttpStatus,
    InternalServerErrorException,
    Logger,
    Post,
    Put,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { randomUUID } from 'crypto';
import { ENUM_APP_STATUS_CODE_ERROR } from 'src/app/enums/app.status-code.enum';
import { RequestRequiredPipe } from 'src/common/request/pipes/request.required.pipe';
import { Response } from 'src/common/response/decorators/response.decorator';
import { IResponse } from 'src/common/response/interfaces/response.interface';
import { ApiKeyProtected } from 'src/modules/api-key/decorators/api-key.decorator';
import {
    AuthJwtAccessProtected,
    AuthJwtPayload,
} from 'src/modules/auth/decorators/auth.jwt.decorator';
import {
    AuthAdminResetMfaDoc,
    AuthAdminUpdatePasswordDoc,
} from 'src/modules/auth/docs/auth.admin.doc';
import { AuthAdminUpdatePasswordRequestDto } from 'src/modules/auth/dtos/request/auth.admin-update-password.request.dto';
import { AuthAdminUpdatePasswordResponseDto } from 'src/modules/auth/dtos/response/auth.admin-update-password.response.dto';
import { ENUM_AUTH_STATUS_CODE_ERROR } from 'src/modules/auth/enums/auth.status-code.enum';
import { IAuthPassword } from 'src/modules/auth/interfaces/auth.interface';
import { AuthService } from 'src/modules/auth/services/auth.service';
import { MfaService } from 'src/modules/auth/services/mfa.service';
import { ENUM_ACTIVITY_ACTION } from 'src/modules/activity/enums/activity.enum';
import { ActivityService } from 'src/modules/activity/services/activity.service';
import { ENUM_SEND_EMAIL_PROCESS } from 'src/modules/email/enums/email.enum';
import { ENUM_PASSWORD_HISTORY_TYPE } from 'src/modules/password-history/enums/password-history.enum';
import { PasswordHistoryService } from 'src/modules/password-history/services/password-history.service';
import {
    PolicyAbilityProtected,
    PolicyRoleProtected,
} from 'src/modules/policy/decorators/policy.decorator';
import {
    ENUM_POLICY_ACTION,
    ENUM_POLICY_ROLE_TYPE,
    ENUM_POLICY_SUBJECT,
} from 'src/modules/policy/enums/policy.enum';
import {
    UserParam,
    UserProtected,
} from 'src/modules/user/decorators/user.decorator';
import { SessionService } from 'src/modules/session/services/session.service';
import { UserNotSelfPipe } from 'src/modules/user/pipes/user.not-self.pipe';
import {
    UserParsePipe,
    UserWithRolePipe,
} from 'src/modules/user/pipes/user.parse.pipe';
import { UserEntity } from 'src/modules/user/repository/entities/user.entity';
import { UserService } from 'src/modules/user/services/user.service';

@ApiTags('modules.admin.auth')
@Controller({
    version: '1',
    path: '/auth',
})
export class AuthAdminController {
    private readonly logger = new Logger(AuthAdminController.name);

    constructor(
        private readonly em: EntityManager,
        private readonly cloudTasksClient: CloudTasksQueueClient,
        private readonly authService: AuthService,
        private readonly userService: UserService,
        private readonly passwordHistoryService: PasswordHistoryService,
        private readonly mfaService: MfaService,
        private readonly activityService: ActivityService,
        private readonly sessionService: SessionService
    ) {}

    /**
     * For a user locked out of their authenticator and recovery codes: turns
     * MFA off, signs them out everywhere, emails them and audits the reset.
     */
    @AuthAdminResetMfaDoc()
    @Response('auth.mfaReset')
    @PolicyAbilityProtected({
        subject: ENUM_POLICY_SUBJECT.AUTH,
        action: [ENUM_POLICY_ACTION.READ, ENUM_POLICY_ACTION.UPDATE],
    })
    @PolicyRoleProtected(ENUM_POLICY_ROLE_TYPE.ADMIN)
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Throttle({ default: { ttl: 60000, limit: 10 } })
    @HttpCode(HttpStatus.OK)
    @Post('/update/:user/mfa/reset')
    async resetMfa(
        @AuthJwtPayload('user') updatedBy: string,
        @AuthJwtPayload('type') updatedByType: ENUM_POLICY_ROLE_TYPE,
        @UserParam('user', RequestRequiredPipe, UserParsePipe, UserNotSelfPipe)
        user: UserEntity
    ): Promise<void> {
        // Same hierarchy as impersonation: an admin acts only on users; only
        // a super admin may reset another admin's second factor.
        if (
            user.role.type !== ENUM_POLICY_ROLE_TYPE.USER &&
            updatedByType !== ENUM_POLICY_ROLE_TYPE.SUPER_ADMIN
        ) {
            throw new ForbiddenException({
                statusCode: ENUM_AUTH_STATUS_CODE_ERROR.MFA_RESET_FORBIDDEN,
                message: 'auth.error.mfaResetForbidden',
            });
        }
        if (!user.mfaEnabled) {
            throw new BadRequestException({
                statusCode: ENUM_AUTH_STATUS_CODE_ERROR.MFA_NOT_ENABLED,
                message: 'auth.error.mfaNotEnabled',
            });
        }

        await this.mfaService.disable(user);
        // A user locked out by failed codes starts over with the new setup.
        await this.userService.clearPasswordAttempt(user);
        await this.mfaService.revokeSessionsAndNotify(user, false);
        await this.activityService.createByAdmin(user, updatedBy, {
            action: ENUM_ACTIVITY_ACTION.UPDATE,
            subject: ENUM_POLICY_SUBJECT.AUTH,
            metadata: { id: user.id, by: updatedBy, mfa: 'reset_by_admin' },
        });
    }

    /**
     * Sets a password the admin typed, or generates a temporary one (emailed
     * and returned once). Either way the user is signed out everywhere and
     * the change is audited. The password itself is never logged.
     */
    @AuthAdminUpdatePasswordDoc()
    @Response('auth.updatePassword')
    @PolicyAbilityProtected({
        subject: ENUM_POLICY_SUBJECT.AUTH,
        action: [ENUM_POLICY_ACTION.READ, ENUM_POLICY_ACTION.UPDATE],
    })
    @PolicyRoleProtected(ENUM_POLICY_ROLE_TYPE.ADMIN)
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Throttle({ default: { ttl: 60000, limit: 10 } })
    @Put('/update/:user/password')
    async updatePassword(
        @AuthJwtPayload('user') updatedBy: string,
        @AuthJwtPayload('type') updatedByType: ENUM_POLICY_ROLE_TYPE,
        @UserParam(
            'user',
            RequestRequiredPipe,
            UserWithRolePipe,
            UserNotSelfPipe
        )
        user: UserEntity,
        @Body() body: AuthAdminUpdatePasswordRequestDto = {},
        // The admin's language: users have no stored preference.
        @Headers('x-custom-lang') language?: string
    ): Promise<IResponse<AuthAdminUpdatePasswordResponseDto>> {
        // A generated password comes back in the response: same hierarchy as
        // resetMfa, or an admin could sign in as a super admin.
        if (
            user.role.type !== ENUM_POLICY_ROLE_TYPE.USER &&
            updatedByType !== ENUM_POLICY_ROLE_TYPE.SUPER_ADMIN
        ) {
            throw new ForbiddenException({
                statusCode:
                    ENUM_AUTH_STATUS_CODE_ERROR.PASSWORD_RESET_FORBIDDEN,
                message: 'auth.error.passwordResetForbidden',
            });
        }

        const typed = body?.password != null;
        const passwordString =
            body?.password ?? this.authService.createPasswordRandom();
        const session = this.em.fork();
        await session.begin();

        let password: IAuthPassword;
        try {
            password = await this.authService.createPassword(passwordString, {
                temporary: !typed,
            });

            user = await this.userService.updatePassword(user, password, {
                em: session,
            });
            user = await this.userService.resetPasswordAttempt(user, {
                em: session,
            });

            await this.passwordHistoryService.createByAdmin(
                user,
                {
                    by: updatedBy,
                    type: typed
                        ? ENUM_PASSWORD_HISTORY_TYPE.CHANGE
                        : ENUM_PASSWORD_HISTORY_TYPE.TEMPORARY,
                },
                { em: session, actionBy: updatedBy }
            );
            await this.activityService.createByAdmin(
                user,
                updatedBy,
                {
                    action: ENUM_ACTIVITY_ACTION.UPDATE,
                    subject: ENUM_POLICY_SUBJECT.AUTH,
                    metadata: {
                        id: user.id,
                        by: updatedBy,
                        password: typed ? 'set_by_admin' : 'reset_by_admin',
                    },
                },
                { em: session }
            );
            await this.sessionService.updateManyRevokeByUser(user.id, {
                em: session,
            });

            await session.commit();
        } catch (err: unknown) {
            await session.rollback();

            throw new InternalServerErrorException({
                statusCode: ENUM_APP_STATUS_CODE_ERROR.UNKNOWN,
                message: 'http.serverError.internalServerError',
                _error: err,
            });
        }

        // A typed password is shared by the admin: the email only says it
        // changed, and the response carries no password.
        const job = typed
            ? ENUM_SEND_EMAIL_PROCESS.CHANGE_PASSWORD
            : ENUM_SEND_EMAIL_PROCESS.TEMPORARY_PASSWORD;
        await this.cloudTasksClient
            .enqueue(
                'email',
                job,
                typed
                    ? { send: { email: user.email, name: user.name } }
                    : {
                          send: { email: user.email, name: user.name },
                          data: {
                              passwordExpiredAt: password.passwordExpired,
                              password: passwordString,
                              language,
                          },
                      },
                { taskName: `${job}-${user.id}-${randomUUID()}` }
            )
            .catch(err => {
                this.logger.warn(
                    `Email queue failed after update-password for user [${user.id}] job [${job}] (non-fatal): ${(err as Error)?.message}`
                );
            });

        return { data: typed ? {} : { password: passwordString } };
    }
}
