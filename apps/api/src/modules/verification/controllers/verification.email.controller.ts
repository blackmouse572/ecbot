import { ENUM_APP_STATUS_CODE_ERROR } from '@app/app/enums/app.status-code.enum';
import { RequestEmailPipe } from '@app/common/request/pipes/request.email.pipe';
import { ENUM_USER_STATUS_CODE_ERROR } from '@app/modules/user/enums/user.status-code.enum';
import { VERIFICATION_EMAIL_RESEND_MIN_REMAINING_MS } from '@app/modules/verification/constants/verification.email.constant';
import {
    VerificationEmailResendEmailDoc,
    VerificationEmailVerifyEmailDoc,
} from '@app/modules/verification/docs/verification.email.doc';
import { VerificationResendEmailRequestDto } from '@app/modules/verification/dtos/request/verification.resend.request.dto';
import { VerificationVerifyEmailRequestDto } from '@app/modules/verification/dtos/request/verification.verify.request.dto';
import { ENUM_VERIFICATION_STATUS_CODE_ERROR } from '@app/modules/verification/enums/verification.status-code.constant';
import { EntityManager } from '@mikro-orm/postgresql';
import {
    Headers,
    BadRequestException,
    Body,
    ConflictException,
    Controller,
    InternalServerErrorException,
    Logger,
    NotFoundException,
    Post,
    Req,
    Res,
} from '@nestjs/common';
import type { Response as ExpressResponse } from 'express';
import { ENUM_ACTIVITY_ACTION } from '@app/modules/activity/enums/activity.enum';
import { ActivityService } from '@app/modules/activity/services/activity.service';
import { AuthLoginResponseDto } from '@app/modules/auth/dtos/response/auth.login.response.dto';
import { AuthService } from '@app/modules/auth/services/auth.service';
import { ENUM_POLICY_SUBJECT } from '@app/modules/policy/enums/policy.enum';
import { SessionService } from '@app/modules/session/services/session.service';
import { ENUM_USER_STATUS } from '@app/modules/user/enums/user.enum';
import { IRequestApp } from 'src/common/request/interfaces/request.interface';
import { IResponse } from 'src/common/response/interfaces/response.interface';
import { ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { randomUUID } from 'crypto';
import { Response } from 'src/common/response/decorators/response.decorator';
import { ApiKeyProtected } from 'src/modules/api-key/decorators/api-key.decorator';
import { ENUM_SEND_EMAIL_PROCESS } from 'src/modules/email/enums/email.enum';
import { UserService } from 'src/modules/user/services/user.service';

import { VerificationService } from 'src/modules/verification/services/verification.service';
import { UserEntity } from 'src/modules/user/repository/entities/user.entity';
import { VerificationEntity } from 'src/modules/verification/repository/entity/verification.entity';
import { CloudTasksQueueClient } from '@app/worker/cloud-tasks-queue.client';

@ApiTags('modules.public.verification')
@Controller({
    version: '1',
    path: '/verification',
})
export class VerificationEmailController {
    private readonly logger = new Logger(VerificationEmailController.name);

    constructor(
        private readonly cloudTasksClient: CloudTasksQueueClient,
        private readonly verificationService: VerificationService,
        private readonly userService: UserService,
        private readonly em: EntityManager,
        private readonly authService: AuthService,
        private readonly sessionService: SessionService,
        private readonly activityService: ActivityService
    ) {}

    @VerificationEmailResendEmailDoc()
    @Response('verification.resendEmail')
    @ApiKeyProtected()
    @Throttle({ default: { ttl: 60000, limit: 5 } })
    @Post('/resend/email')
    async resendVerificationEmail(
        @Body(new RequestEmailPipe())
        { email, id }: VerificationResendEmailRequestDto,
        @Headers('x-custom-lang') language?: string
    ): Promise<void> {
        const [existing, user] = await Promise.all([
            this.verificationService.findOneActiveLatestEmailByUser(id, email),
            this.userService.findOneById(id),
        ]);

        const canIssue =
            !!user &&
            user.email?.toLowerCase() === email.toLowerCase() &&
            user.verification?.email !== true;
        if (!existing && !canIssue) {
            throw new ConflictException({
                statusCode: ENUM_VERIFICATION_STATUS_CODE_ERROR.NOT_FOUND,
                message: 'verification.error.notFound',
            });
        }

        if (!user) {
            throw new NotFoundException({
                statusCode: ENUM_USER_STATUS_CODE_ERROR.NOT_FOUND,
                message: 'user.error.notFound',
            });
        }

        // Re-send the active code while it has time left, so a code from an
        // earlier email keeps working. Otherwise issue a fresh one: a code
        // about to expire could arrive already expired, and an expired or
        // attempt-locked code leaves no active row at all (login refuses an
        // unverified user, so they must never be stuck).
        const keepExisting =
            !!existing &&
            (!canIssue ||
                existing.expiredDate.getTime() - Date.now() >=
                    VERIFICATION_EMAIL_RESEND_MIN_REMAINING_MS);
        const verification = keepExisting
            ? existing
            : await this.reissueEmail(user);

        await this.cloudTasksClient
            .enqueue(
                'email',
                ENUM_SEND_EMAIL_PROCESS.VERIFICATION,
                {
                    send: { email: user.email, name: user.name },
                    data: {
                        otp: verification.otp,
                        expiredAt: verification.expiredDate,
                        reference: verification.reference,
                        language,
                    },
                },
                {
                    taskName: `${ENUM_SEND_EMAIL_PROCESS.VERIFICATION}-${user.id}-${randomUUID()}`,
                }
            )
            .catch(err => {
                this.logger.warn(
                    `Email queue failed after resend-verification-email for user [${user.id}] job [${ENUM_SEND_EMAIL_PROCESS.VERIFICATION}] (non-fatal): ${(err as Error)?.message}`
                );
            });
    }

    private async reissueEmail(user: UserEntity): Promise<VerificationEntity> {
        const session = this.em.fork();
        await session.begin();

        try {
            await this.verificationService.inactiveEmailManyByUser(user.id, {
                em: session,
            });
            const verification =
                await this.verificationService.createEmailByUser(user, {
                    em: session,
                });
            await session.commit();

            return verification;
        } catch (err: unknown) {
            await session.rollback();

            throw new InternalServerErrorException({
                statusCode: ENUM_APP_STATUS_CODE_ERROR.UNKNOWN,
                message: 'http.serverError.internalServerError',
                _error: err,
            });
        }
    }

    @VerificationEmailVerifyEmailDoc()
    @Response('verification.verifyEmail')
    @ApiKeyProtected()
    @Throttle({ default: { ttl: 60000, limit: 5 } })
    @Post('/verify/email')
    async verifyEmail(
        @Body(new RequestEmailPipe())
        { email, id, otp }: VerificationVerifyEmailRequestDto,
        @Req() request?: IRequestApp,
        @Res({ passthrough: true }) res?: ExpressResponse
    ): Promise<IResponse<AuthLoginResponseDto> | void> {
        const [verificationTask, userTask] = await Promise.allSettled([
            this.verificationService.findOneActiveLatestEmailByUser(id, email),
            this.userService.findOneById(id),
        ]);
        const verification =
            verificationTask.status === 'fulfilled'
                ? verificationTask.value
                : null;
        const user = userTask.status === 'fulfilled' ? userTask.value : null;
        if (!verification) {
            const expired =
                await this.verificationService.findOneExpiredLatestEmailByUser(
                    id,
                    email
                );
            if (expired) {
                throw new BadRequestException({
                    statusCode: ENUM_VERIFICATION_STATUS_CODE_ERROR.EXPIRED,
                    message: 'verification.error.expired',
                });
            }
            throw new NotFoundException({
                statusCode: ENUM_VERIFICATION_STATUS_CODE_ERROR.NOT_FOUND,
                message: 'verification.error.notFound',
            });
        }
        if (!user) {
            throw new NotFoundException({
                statusCode: ENUM_USER_STATUS_CODE_ERROR.NOT_FOUND,
                message: 'user.error.notFound',
            });
        }

        const check: boolean = this.verificationService.validateOtp(
            verification,
            otp
        );
        if (!check) {
            const attempted =
                await this.verificationService.incrementOtpAttempt(
                    verification
                );
            if (!attempted.isActive) {
                throw new BadRequestException({
                    statusCode: ENUM_VERIFICATION_STATUS_CODE_ERROR.ATTEMPT_MAX,
                    message: 'verification.error.attemptMax',
                });
            }

            throw new BadRequestException({
                statusCode: ENUM_VERIFICATION_STATUS_CODE_ERROR.OTP_NOT_MATCH,
                message: 'verification.error.otpNotMatch',
            });
        }

        const session = this.em.fork();
        await session.begin();

        try {
            await this.verificationService.verify(verification, {
                em: session,
            });
            await this.userService.updateVerificationEmail(user, {
                em: session,
            });

            await session.commit();

            await this.cloudTasksClient
                .enqueue(
                    'email',
                    ENUM_SEND_EMAIL_PROCESS.EMAIL_VERIFIED,
                    {
                        send: { email: user.email, name: user.name },
                        data: { reference: verification.reference },
                    },
                    {
                        taskName: `${ENUM_SEND_EMAIL_PROCESS.EMAIL_VERIFIED}-${user.id}-${randomUUID()}`,
                    }
                )
                .catch(err => {
                    this.logger.warn(
                        `Email queue failed after verify-email for user [${user.id}] job [${ENUM_SEND_EMAIL_PROCESS.EMAIL_VERIFIED}] (non-fatal): ${(err as Error)?.message}`
                    );
                });
        } catch (err: unknown) {
            await session.rollback();

            throw new InternalServerErrorException({
                statusCode: ENUM_APP_STATUS_CODE_ERROR.UNKNOWN,
                message: 'http.serverError.internalServerError',
                _error: err,
            });
        }

        // The code proves the visitor owns the address, so sign them in
        // rather than send them to the login form to type it all again (#143).
        const token = await this.signInVerifiedUser(user, request, res);
        return token ? { data: token } : undefined;
    }

    /**
     * Opens a session for a user who just verified their email, with the same
     * checks and steps as a credential login. Returns nothing when the user
     * could not log in either (inactive, role off, password expired) or the
     * session fails: their email is verified, and they can still log in.
     */
    private async signInVerifiedUser(
        user: UserEntity,
        request: IRequestApp | undefined,
        res: ExpressResponse | undefined
    ): Promise<AuthLoginResponseDto | undefined> {
        if (!request || !res || user.status !== ENUM_USER_STATUS.ACTIVE) {
            return undefined;
        }
        const userWithRole = await this.userService.join(user);
        if (
            !userWithRole?.role?.isActive ||
            this.authService.checkPasswordExpired(user.passwordExpired)
        ) {
            return undefined;
        }

        const databaseSession = this.em.fork();
        await databaseSession.begin();
        let token: AuthLoginResponseDto;
        try {
            const session = await this.sessionService.create(
                request,
                { user: user.id },
                { em: databaseSession }
            );
            await this.sessionService.setLoginSession(userWithRole, session);
            token = this.authService.createToken(
                userWithRole,
                session.id,
                false
            );
            await databaseSession.commit();
        } catch (err: unknown) {
            try {
                await databaseSession.rollback();
            } catch {
                /* ignore rollback error */
            }
            this.logger.warn(
                `Sign-in after email verification failed for user [${user.id}] (non-fatal): ${(err as Error)?.message}`
            );
            return undefined;
        }

        this.authService.setRefreshTokenCookie(res, token.refreshToken, false);
        await this.activityService
            .createByUser(user, {
                action: ENUM_ACTIVITY_ACTION.CREATE,
                subject: ENUM_POLICY_SUBJECT.AUTH,
                metadata: { id: user.id, name: user.email },
            })
            .catch(() => undefined);
        return token;
    }
}
