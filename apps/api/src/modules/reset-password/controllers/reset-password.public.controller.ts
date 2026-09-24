import { CloudTasksQueueClient } from '@app/worker/cloud-tasks-queue.client';
import { EntityManager } from '@mikro-orm/postgresql';
import {
    BadRequestException,
    Body,
    Controller,
    HttpCode,
    HttpStatus,
    InternalServerErrorException,
    Logger,
    NotFoundException,
    Param,
    Post,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { uniqueId } from 'lodash';
import { ENUM_APP_STATUS_CODE_ERROR } from 'src/app/enums/app.status-code.enum';
import { RequestRequiredPipe } from 'src/common/request/pipes/request.required.pipe';
import { Response } from 'src/common/response/decorators/response.decorator';
import { IResponse } from 'src/common/response/interfaces/response.interface';
import { ApiKeyProtected } from 'src/modules/api-key/decorators/api-key.decorator';
import { IAuthPassword } from 'src/modules/auth/interfaces/auth.interface';
import { AuthService } from 'src/modules/auth/services/auth.service';
import { ENUM_SEND_EMAIL_PROCESS } from 'src/modules/email/enums/email.enum';
import { ENUM_PASSWORD_HISTORY_TYPE } from 'src/modules/password-history/enums/password-history.enum';
import { PasswordHistoryService } from 'src/modules/password-history/services/password-history.service';
import {
    ResetPasswordPublicGetDoc,
    ResetPasswordPublicRequestDoc,
    ResetPasswordPublicResetDoc,
    ResetPasswordPublicVerifyDoc,
} from 'src/modules/reset-password/docs/reset-password.public.doc';
import { ResetPasswordCreateRequestDto } from 'src/modules/reset-password/dtos/request/reset-password.create.request.dto';
import { ResetPasswordResetRequestDto } from 'src/modules/reset-password/dtos/request/reset-password.reset.request.dto';
import { ResetPasswordVerifyRequestDto } from 'src/modules/reset-password/dtos/request/reset-password.verify.request.dto';
import { ResetPasswordCreteResponseDto } from 'src/modules/reset-password/dtos/response/reset-password.create.response.dto';
import { ENUM_RESET_PASSWORD_STATUS_CODE_ERROR } from 'src/modules/reset-password/enums/reset-password.status-code.enum';
import { IResetPasswordRequest } from 'src/modules/reset-password/interfaces/reset-password.interface';
import { ResetPasswordActivePipe } from 'src/modules/reset-password/pipes/reset-password.active.pipe';
import { ResetPasswordDateExpiredPipe } from 'src/modules/reset-password/pipes/reset-password.date-expired.pipe';
import { ResetPasswordExpiredPipe } from 'src/modules/reset-password/pipes/reset-password.expired.pipe';
import { ResetPasswordParseByTokenPipe } from 'src/modules/reset-password/pipes/reset-password.parse.pipe';
import { ResetPasswordVerifiedPipe } from 'src/modules/reset-password/pipes/reset-password.verified.pipe';
import { ResetPasswordEntity } from 'src/modules/reset-password/repository/entities/reset-password.entity';
import { ResetPasswordService } from 'src/modules/reset-password/services/reset-password.service';
import { SessionService } from 'src/modules/session/services/session.service';
import { ENUM_USER_STATUS_CODE_ERROR } from 'src/modules/user/enums/user.status-code.enum';
import { UserEntity } from 'src/modules/user/repository/entities/user.entity';
import { UserService } from 'src/modules/user/services/user.service';

@ApiTags('modules.public.resetPassword')
@Controller({
    version: '1',
    path: '/reset-password',
})
export class ResetPasswordPublicController {
    private readonly logger = new Logger(ResetPasswordPublicController.name);

    constructor(
        private readonly em: EntityManager,
        private readonly cloudTasksClient: CloudTasksQueueClient,
        private readonly userService: UserService,
        private readonly passwordHistoryService: PasswordHistoryService,
        private readonly authService: AuthService,
        private readonly resetPasswordService: ResetPasswordService,
        private readonly sessionService: SessionService
    ) {}

    @ResetPasswordPublicRequestDoc()
    @Response('resetPassword.request')
    @ApiKeyProtected()
    @HttpCode(HttpStatus.OK)
    @Post('/request')
    async request(
        @Body() { email }: ResetPasswordCreateRequestDto
    ): Promise<IResponse<void>> {
        // No enumeration: every outcome below (unknown email, already an
        // active pending reset, or a freshly created one) returns this same
        // empty ack — never the token/url, never a 404 for an unknown email.
        const ack: IResponse<void> = { data: undefined };

        const user: UserEntity =
            await this.userService.findOneActiveByEmail(email);
        if (!user) {
            return ack;
        }

        const checkLatest: IResetPasswordRequest =
            await this.resetPasswordService.checkActiveLatestEmailByUser(
                user.id
            );
        if (checkLatest) {
            return ack;
        }

        const session = this.em.fork();
        await session.begin();

        try {
            await this.resetPasswordService.inactiveEmailManyByUser(user.id, {
                em: session,
            });

            const resetPassword =
                await this.resetPasswordService.requestEmailByUser(
                    user.id,
                    {
                        email: user.email,
                    },
                    { em: session }
                );

            this.cloudTasksClient
                .enqueue(
                    'email',
                    ENUM_SEND_EMAIL_PROCESS.RESET_PASSWORD,
                    {
                        send: { email: user.email, name: user.name },
                        data: resetPassword.created,
                    },
                    {
                        taskName: `${ENUM_SEND_EMAIL_PROCESS.RESET_PASSWORD}-${user.id}-${uniqueId('RP')}`,
                    }
                )
                .catch(err => {
                    this.logger.warn(
                        `Email queue failed after reset-password request for user [${user.id}] job [${ENUM_SEND_EMAIL_PROCESS.RESET_PASSWORD}] (non-fatal): ${(err as Error)?.message}`
                    );
                });

            await session.commit();

            return ack;
        } catch (err: unknown) {
            await session.rollback();

            throw new InternalServerErrorException({
                statusCode: ENUM_APP_STATUS_CODE_ERROR.UNKNOWN,
                message: 'http.serverError.internalServerError',
                _error: err,
            });
        }
    }

    @ResetPasswordPublicGetDoc()
    @Response('resetPassword.get')
    @ApiKeyProtected()
    @HttpCode(HttpStatus.OK)
    @Post('/get/:token')
    async get(
        @Param(
            'token',
            RequestRequiredPipe,
            ResetPasswordParseByTokenPipe,
            ResetPasswordActivePipe,
            ResetPasswordExpiredPipe
        )
        resetPassword: ResetPasswordEntity
    ): Promise<IResponse<ResetPasswordCreteResponseDto>> {
        const user = await this.userService.findOneById(resetPassword.user.id);
        if (!user) {
            throw new NotFoundException({
                statusCode: ENUM_USER_STATUS_CODE_ERROR.NOT_FOUND,
                message: 'user.error.notFound',
            });
        }

        const mapped = this.resetPasswordService.mapResetPasswordResponse(
            resetPassword,
            {
                email: user.email,
            }
        );

        return {
            data: mapped,
        };
    }

    @ResetPasswordPublicVerifyDoc()
    @Response('resetPassword.verify')
    @ApiKeyProtected()
    @HttpCode(HttpStatus.OK)
    @Post('/verify/:token')
    async verify(
        @Param(
            'token',
            RequestRequiredPipe,
            ResetPasswordParseByTokenPipe,
            ResetPasswordActivePipe,
            ResetPasswordExpiredPipe
        )
        resetPassword: ResetPasswordEntity,
        @Body()
        { otp }: ResetPasswordVerifyRequestDto
    ): Promise<void> {
        const user = await this.userService.findOneById(resetPassword.user.id);
        if (!user) {
            throw new NotFoundException({
                statusCode: ENUM_USER_STATUS_CODE_ERROR.NOT_FOUND,
                message: 'user.error.notFound',
            });
        }

        const check: boolean = this.resetPasswordService.checkOtp(
            resetPassword.otp,
            otp
        );
        if (!check) {
            const attempted =
                await this.resetPasswordService.incrementOtpAttempt(
                    resetPassword
                );
            if (!attempted.isActive) {
                throw new BadRequestException({
                    statusCode:
                        ENUM_RESET_PASSWORD_STATUS_CODE_ERROR.ATTEMPT_MAX,
                    message: 'resetPassword.error.attemptMax',
                });
            }

            throw new BadRequestException({
                statusCode: ENUM_RESET_PASSWORD_STATUS_CODE_ERROR.OTP_NOT_MATCH,
                message: 'resetPassword.error.otpNotMatch',
            });
        }

        await this.resetPasswordService.verify(resetPassword);

        return;
    }

    @ResetPasswordPublicResetDoc()
    @Response('resetPassword.reset')
    @ApiKeyProtected()
    @HttpCode(HttpStatus.OK)
    @Post('/reset/:token')
    async reset(
        @Param(
            'token',
            RequestRequiredPipe,
            ResetPasswordParseByTokenPipe,
            ResetPasswordActivePipe,
            ResetPasswordDateExpiredPipe,
            ResetPasswordVerifiedPipe
        )
        resetPassword: ResetPasswordEntity,
        @Body()
        { newPassword }: ResetPasswordResetRequestDto
    ): Promise<void> {
        let user = await this.userService.findOneById(resetPassword.user.id);
        if (!user) {
            throw new NotFoundException({
                statusCode: ENUM_USER_STATUS_CODE_ERROR.NOT_FOUND,
                message: 'user.error.notFound',
            });
        }

        const session = this.em.fork();
        await session.begin();

        try {
            const password: IAuthPassword =
                this.authService.createPassword(newPassword);

            user = await this.userService.updatePassword(user, password, {
                em: session,
            });
            await this.resetPasswordService.reset(resetPassword, {
                em: session,
            });
            await this.passwordHistoryService.createByUser(user, {
                type: ENUM_PASSWORD_HISTORY_TYPE.FORGOT,
            });
            await this.sessionService.updateManyRevokeByUser(user.id, {
                em: session,
            });

            this.cloudTasksClient
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
                        `Email queue failed after reset-password reset for user [${user.id}] job [${ENUM_SEND_EMAIL_PROCESS.CHANGE_PASSWORD}] (non-fatal): ${(err as Error)?.message}`
                    );
                });

            await session.commit();

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
