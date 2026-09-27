import { CloudTasksQueueClient } from '@app/worker/cloud-tasks-queue.client';
import { EntityManager } from '@mikro-orm/postgresql';
import {
    Controller,
    InternalServerErrorException,
    Logger,
    Put,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { uniqueId } from 'lodash';
import { ENUM_APP_STATUS_CODE_ERROR } from 'src/app/enums/app.status-code.enum';
import { RequestRequiredPipe } from 'src/common/request/pipes/request.required.pipe';
import { Response } from 'src/common/response/decorators/response.decorator';
import { ApiKeyProtected } from 'src/modules/api-key/decorators/api-key.decorator';
import {
    AuthJwtAccessProtected,
    AuthJwtPayload,
} from 'src/modules/auth/decorators/auth.jwt.decorator';
import { AuthAdminUpdatePasswordDoc } from 'src/modules/auth/docs/auth.admin.doc';
import { AuthService } from 'src/modules/auth/services/auth.service';
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
import { UserNotSelfPipe } from 'src/modules/user/pipes/user.not-self.pipe';
import { UserParsePipe } from 'src/modules/user/pipes/user.parse.pipe';
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
        private readonly passwordHistoryService: PasswordHistoryService
    ) {}

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
    @Put('/update/:user/password')
    async updatePassword(
        @AuthJwtPayload('user') updatedBy: string,
        @UserParam('user', RequestRequiredPipe, UserParsePipe, UserNotSelfPipe)
        user: UserEntity
    ): Promise<void> {
        const session = this.em.fork();
        await session.begin();

        try {
            const passwordString = this.authService.createPasswordRandom();
            const password = await this.authService.createPassword(
                passwordString,
                { temporary: true }
            );

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
                    type: ENUM_PASSWORD_HISTORY_TYPE.TEMPORARY,
                },
                { em: session, actionBy: updatedBy }
            );

            await session.commit();

            await this.cloudTasksClient
                .enqueue(
                    'email',
                    ENUM_SEND_EMAIL_PROCESS.TEMPORARY_PASSWORD,
                    {
                        send: { email: user.email, name: user.name },
                        data: {
                            passwordExpiredAt: password.passwordExpired,
                            password: passwordString,
                        },
                    },
                    {
                        taskName: `${ENUM_SEND_EMAIL_PROCESS.TEMPORARY_PASSWORD}-${user.id}-${uniqueId('TP')}`,
                    }
                )
                .catch(err => {
                    this.logger.warn(
                        `Email queue failed after update-password for user [${user.id}] job [${ENUM_SEND_EMAIL_PROCESS.TEMPORARY_PASSWORD}] (non-fatal): ${(err as Error)?.message}`
                    );
                });

            return;
        } catch (err: unknown) {
            await session.rollback();

            throw new InternalServerErrorException({
                statusCode: ENUM_APP_STATUS_CODE_ERROR.UNKNOWN,
                message: 'http.serverError.internalServerError',
                _error: err,
            });
        }
    }
}
