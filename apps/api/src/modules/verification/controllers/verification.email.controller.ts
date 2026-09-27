import { ENUM_APP_STATUS_CODE_ERROR } from '@app/app/enums/app.status-code.enum';
import { RequestEmailPipe } from '@app/common/request/pipes/request.email.pipe';
import { ENUM_USER_STATUS_CODE_ERROR } from '@app/modules/user/enums/user.status-code.enum';
import { VERIFICATION_EMAIL_TTL } from '@app/modules/verification/constants/verification.email.constant';
import {
    VerificationEmailResendEmailDoc,
    VerificationEmailVerifyEmailDoc,
} from '@app/modules/verification/docs/verification.email.doc';
import { VerificationResendEmailRequestDto } from '@app/modules/verification/dtos/request/verification.resend.request.dto';
import { VerificationVerifyEmailRequestDto } from '@app/modules/verification/dtos/request/verification.verify.request.dto';
import { ENUM_VERIFICATION_STATUS_CODE_ERROR } from '@app/modules/verification/enums/verification.status-code.constant';
import { EntityManager } from '@mikro-orm/postgresql';
import {
    BadRequestException,
    Body,
    ConflictException,
    Controller,
    InternalServerErrorException,
    Logger,
    NotFoundException,
    Post,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { uniqueId } from 'lodash';
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
        private readonly em: EntityManager
    ) {}

    @VerificationEmailResendEmailDoc()
    @Response('verification.resendEmail')
    @ApiKeyProtected()
    @Throttle({ default: { ttl: 60000, limit: 5 } })
    @Post('/resend/email')
    async resendVerificationEmail(
        @Body(new RequestEmailPipe())
        { email, id }: VerificationResendEmailRequestDto
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

        // An expired or attempt-locked code leaves no active row: issue a
        // fresh one so an unverified user is never stuck (login refuses them).
        const verification = existing ?? (await this.reissueEmail(user));

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
                    },
                },
                {
                    taskName: `${ENUM_SEND_EMAIL_PROCESS.VERIFICATION}-${user.id}-${uniqueId('VE')}`,
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
        { email, id, otp }: VerificationVerifyEmailRequestDto
    ): Promise<void> {
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
                        taskName: `${ENUM_SEND_EMAIL_PROCESS.EMAIL_VERIFIED}-${user.id}-${uniqueId('EV')}`,
                    }
                )
                .catch(err => {
                    this.logger.warn(
                        `Email queue failed after verify-email for user [${user.id}] job [${ENUM_SEND_EMAIL_PROCESS.EMAIL_VERIFIED}] (non-fatal): ${(err as Error)?.message}`
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
