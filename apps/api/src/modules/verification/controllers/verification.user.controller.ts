import { ENUM_SEND_SMS_PROCESS } from '@app/modules/sms/enums/sms.enum';
import { CloudTasksQueueClient } from '@app/worker/cloud-tasks-queue.client';
import { EntityManager } from '@mikro-orm/postgresql';
import {
    BadRequestException,
    Body,
    Controller,
    Get,
    HttpCode,
    HttpStatus,
    InternalServerErrorException,
    Logger,
    NotFoundException,
    Post,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { uniqueId } from 'lodash';
import { ENUM_APP_STATUS_CODE_ERROR } from 'src/app/enums/app.status-code.enum';
import { Response } from 'src/common/response/decorators/response.decorator';
import { IResponse } from 'src/common/response/interfaces/response.interface';
import { ApiKeyProtected } from 'src/modules/api-key/decorators/api-key.decorator';
import {
    AuthJwtAccessProtected,
    AuthJwtPayload,
} from 'src/modules/auth/decorators/auth.jwt.decorator';
import { IAuthJwtAccessTokenPayload } from 'src/modules/auth/interfaces/auth.interface';
import { ENUM_SEND_EMAIL_PROCESS } from 'src/modules/email/enums/email.enum';
import { PolicyRoleProtected } from 'src/modules/policy/decorators/policy.decorator';
import { ENUM_POLICY_ROLE_TYPE } from 'src/modules/policy/enums/policy.enum';
import { UserProtected } from 'src/modules/user/decorators/user.decorator';
import { UserParsePipe } from 'src/modules/user/pipes/user.parse.pipe';
import { UserEntity } from 'src/modules/user/repository/entities/user.entity';
import { UserService } from 'src/modules/user/services/user.service';
import {
    VerificationUserGetEmailDoc,
    VerificationUserGetMobileNumberDoc,
    VerificationUserResendEmailDoc,
    VerificationUserResendMobileNumberDoc,
    VerificationUserVerifyEmailDoc,
    VerificationUserVerifyMobileNumberDoc,
} from 'src/modules/verification/docs/verification.user.doc';
import { VerificationVerifyRequestDto } from 'src/modules/verification/dtos/request/verification.verify.request.dto';
import { VerificationResponse } from 'src/modules/verification/dtos/response/verification.response';
import { ENUM_VERIFICATION_STATUS_CODE_ERROR } from 'src/modules/verification/enums/verification.status-code.constant';
import {
    VerificationUserEmailNotVerifiedYetPipe,
    VerificationUserMobileNumberNotVerifiedYetPipe,
} from 'src/modules/verification/pipes/verification.user-not-verified-yet.pipe';
import { VerificationEntity } from 'src/modules/verification/repository/entity/verification.entity';
import { VerificationService } from 'src/modules/verification/services/verification.service';

@ApiTags('modules.user.verification')
@Controller({
    version: '1',
    path: '/verification',
})
export class VerificationUserController {
    private readonly logger = new Logger(VerificationUserController.name);

    constructor(
        private readonly em: EntityManager,
        private readonly cloudTasksClient: CloudTasksQueueClient,
        private readonly verificationService: VerificationService,
        private readonly userService: UserService
    ) {}

    @VerificationUserGetEmailDoc()
    @Response('verification.getEmail')
    @PolicyRoleProtected(ENUM_POLICY_ROLE_TYPE.USER)
    @UserProtected([false])
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Get('/get/email')
    async getEmail(
        @AuthJwtPayload<IAuthJwtAccessTokenPayload>('user', UserParsePipe)
        user: UserEntity
    ): Promise<IResponse<VerificationResponse>> {
        const verification: VerificationEntity =
            await this.verificationService.findOneLatestEmailByUser(user.id);
        if (!verification) {
            throw new NotFoundException({
                statusCode: ENUM_VERIFICATION_STATUS_CODE_ERROR.NOT_FOUND,
                message: 'verification.error.notFound',
            });
        }

        const mapped: VerificationResponse =
            this.verificationService.map(verification);

        return {
            data: mapped,
        };
    }

    @VerificationUserGetMobileNumberDoc()
    @Response('verification.getMobileNumber')
    @PolicyRoleProtected(ENUM_POLICY_ROLE_TYPE.USER)
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Get('/get/mobile-number')
    async getMobileNumber(
        @AuthJwtPayload<IAuthJwtAccessTokenPayload>('user', UserParsePipe)
        user: UserEntity
    ): Promise<IResponse<VerificationResponse>> {
        const verification: VerificationEntity =
            await this.verificationService.findOneLatestMobileNumberByUser(
                user.id
            );
        if (!verification) {
            throw new NotFoundException({
                statusCode: ENUM_VERIFICATION_STATUS_CODE_ERROR.NOT_FOUND,
                message: 'verification.error.notFound',
            });
        }

        const mapped: VerificationResponse =
            this.verificationService.map(verification);

        return {
            data: mapped,
        };
    }

    @VerificationUserResendEmailDoc()
    @Response('verification.resendEmail')
    @PolicyRoleProtected(ENUM_POLICY_ROLE_TYPE.USER)
    @UserProtected([false])
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Post('/resend/email')
    async resendEmail(
        @AuthJwtPayload<IAuthJwtAccessTokenPayload>('user', UserParsePipe)
        user: UserEntity
    ): Promise<IResponse<VerificationResponse>> {
        const latestVerification: VerificationEntity =
            await this.verificationService.findOneLatestEmailByUser(user.id);
        if (latestVerification) {
            const mapped: VerificationResponse =
                this.verificationService.map(latestVerification);

            return {
                data: mapped,
            };
        }

        const session = this.em.fork();
        await session.begin();

        try {
            await this.verificationService.inactiveEmailManyByUser(user.id, {
                em: session,
            });

            const verification: VerificationEntity =
                await this.verificationService.createEmailByUser(user, {
                    em: session,
                });

            await session.commit();

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
                        `Email queue failed after resend-email verification for user [${user.id}] job [${ENUM_SEND_EMAIL_PROCESS.VERIFICATION}] (non-fatal): ${(err as Error)?.message}`
                    );
                });

            const mapped: VerificationResponse =
                this.verificationService.map(latestVerification);

            return {
                data: mapped,
            };
        } catch (err: unknown) {
            await session.rollback();

            throw new InternalServerErrorException({
                statusCode: ENUM_APP_STATUS_CODE_ERROR.UNKNOWN,
                message: 'http.serverError.internalServerError',
                _error: err,
            });
        }
    }

    @VerificationUserResendMobileNumberDoc()
    @Response('verification.resendMobileNumber')
    @PolicyRoleProtected(ENUM_POLICY_ROLE_TYPE.USER)
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Post('/resend/mobile-number')
    async resendMobileNumber(
        @AuthJwtPayload<IAuthJwtAccessTokenPayload>('user', UserParsePipe)
        user: UserEntity
    ): Promise<IResponse<VerificationResponse>> {
        const latestVerification: VerificationEntity =
            await this.verificationService.findOneLatestMobileNumberByUser(
                user.id
            );
        if (latestVerification) {
            const mapped: VerificationResponse =
                this.verificationService.map(latestVerification);

            return {
                data: mapped,
            };
        }

        const session = this.em.fork();
        await session.begin();

        try {
            await this.verificationService.inactiveMobileNumberManyByUser(
                user.id,
                {
                    em: session,
                }
            );

            const verification: VerificationEntity =
                await this.verificationService.createMobileNumberByUser(user, {
                    em: session,
                });

            await session.commit();

            await this.cloudTasksClient.enqueue(
                'sms',
                ENUM_SEND_SMS_PROCESS.VERIFICATION,
                {
                    send: {
                        name: user.name,
                        mobileNumber: user.mobileNumber?.number,
                    },
                    data: {
                        otp: verification.otp,
                        expiredAt: verification.expiredDate,
                    },
                },
                {
                    taskName: `${ENUM_SEND_SMS_PROCESS.VERIFICATION}-${user.id}-${uniqueId('SMS')}`,
                }
            );

            const mapped: VerificationResponse =
                this.verificationService.map(latestVerification);

            return {
                data: mapped,
            };
        } catch (err: unknown) {
            await session.rollback();

            throw new InternalServerErrorException({
                statusCode: ENUM_APP_STATUS_CODE_ERROR.UNKNOWN,
                message: 'http.serverError.internalServerError',
                _error: err,
            });
        }
    }

    @VerificationUserVerifyEmailDoc()
    @Response('verification.verifyEmail')
    @PolicyRoleProtected(ENUM_POLICY_ROLE_TYPE.USER)
    @UserProtected([false])
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @HttpCode(HttpStatus.OK)
    @Post('/verify/email')
    async verifyEmail(
        @AuthJwtPayload<IAuthJwtAccessTokenPayload>(
            'user',
            UserParsePipe,
            VerificationUserEmailNotVerifiedYetPipe
        )
        user: UserEntity,
        @Body() { otp }: VerificationVerifyRequestDto
    ): Promise<void> {
        const verification: VerificationEntity =
            await this.verificationService.findOneLatestEmailByUser(user.id);
        if (!verification) {
            throw new NotFoundException({
                statusCode: ENUM_VERIFICATION_STATUS_CODE_ERROR.NOT_FOUND,
                message: 'verification.error.notFound',
            });
        }

        const check: boolean = this.verificationService.validateOtp(
            verification,
            otp
        );
        if (!check) {
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

    @VerificationUserVerifyMobileNumberDoc()
    @Response('verification.verifyMobileNumber')
    @PolicyRoleProtected(ENUM_POLICY_ROLE_TYPE.USER)
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @HttpCode(HttpStatus.OK)
    @Post('/verify/mobile-number')
    async verifyMobileNumber(
        @AuthJwtPayload<IAuthJwtAccessTokenPayload>(
            'user',
            UserParsePipe,
            VerificationUserMobileNumberNotVerifiedYetPipe
        )
        user: UserEntity,
        @Body() { otp }: VerificationVerifyRequestDto
    ): Promise<void> {
        const verification: VerificationEntity =
            await this.verificationService.findOneLatestMobileNumberByUser(
                user.id
            );
        if (!verification) {
            throw new NotFoundException({
                statusCode: ENUM_VERIFICATION_STATUS_CODE_ERROR.NOT_FOUND,
                message: 'verification.error.notFound',
            });
        }

        const check: boolean = this.verificationService.validateOtp(
            verification,
            otp
        );
        if (!check) {
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
            await this.userService.updateVerificationMobileNumber(user, {
                em: session,
            });

            await session.commit();

            await this.cloudTasksClient
                .enqueue(
                    'email',
                    ENUM_SEND_EMAIL_PROCESS.MOBILE_NUMBER_VERIFIED,
                    {
                        send: { email: user.email, name: user.name },
                        data: {
                            mobileNumber:
                                this.verificationService.map(verification).to,
                            reference: verification.reference,
                        },
                    },
                    {
                        taskName: `${ENUM_SEND_EMAIL_PROCESS.MOBILE_NUMBER_VERIFIED}-${user.id}-${uniqueId('MV')}`,
                    }
                )
                .catch(err => {
                    this.logger.warn(
                        `Email queue failed after verify-mobile-number for user [${user.id}] job [${ENUM_SEND_EMAIL_PROCESS.MOBILE_NUMBER_VERIFIED}] (non-fatal): ${(err as Error)?.message}`
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
