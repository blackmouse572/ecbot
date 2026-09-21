import { RequestEmailPipe } from '@app/common/request/pipes/request.email.pipe';
import { ENUM_ACTIVITY_ACTION } from '@app/modules/activity/enums/activity.enum';
import { AuthSignUpResponseDto } from '@app/modules/auth/dtos/response/auth.signup.response.dto';
import { ENUM_POLICY_SUBJECT } from '@app/modules/policy/enums/policy.enum';
import { CloudTasksQueueClient } from '@app/worker/cloud-tasks-queue.client';
import { EntityManager } from '@mikro-orm/postgresql';
import {
    BadRequestException,
    Body,
    ConflictException,
    Controller,
    ForbiddenException,
    HttpCode,
    HttpStatus,
    InternalServerErrorException,
    Logger,
    NotFoundException,
    Post,
    Req,
    Res,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { Response as ExpressResponse } from 'express';
import { ENUM_APP_STATUS_CODE_ERROR } from 'src/app/enums/app.status-code.enum';
import { MessageService } from 'src/common/message/services/message.service';
import { IRequestApp } from 'src/common/request/interfaces/request.interface';
import { Response } from 'src/common/response/decorators/response.decorator';
import { ENUM_TURNSTILE_ACTION } from 'src/common/turnstile/enums/turnstile.action.enum';
import { TurnstileService } from 'src/common/turnstile/services/turnstile.service';
import { IResponse } from 'src/common/response/interfaces/response.interface';
import { ActivityService } from 'src/modules/activity/services/activity.service';
import { ApiKeyProtected } from 'src/modules/api-key/decorators/api-key.decorator';
import { AuthJwtPayload } from 'src/modules/auth/decorators/auth.jwt.decorator';
import {
    AuthSocialAppleProtected,
    AuthSocialGoogleProtected,
} from 'src/modules/auth/decorators/auth.social.decorator';
import {
    AuthPublicLoginCredentialDoc,
    AuthPublicLoginSocialAppleDoc,
    AuthPublicLoginSocialGoogleDoc,
    AuthPublicSignUpDoc,
} from 'src/modules/auth/docs/auth.public.doc';
import { AuthLoginRequestDto } from 'src/modules/auth/dtos/request/auth.login.request.dto';
import { AuthSignUpRequestDto } from 'src/modules/auth/dtos/request/auth.sign-up.request.dto';
import { AuthLoginResponseDto } from 'src/modules/auth/dtos/response/auth.login.response.dto';
import {
    IAuthSocialApplePayload,
    IAuthSocialGooglePayload,
} from 'src/modules/auth/interfaces/auth.interface';
import { AuthService } from 'src/modules/auth/services/auth.service';
import { ENUM_COUNTRY_STATUS_CODE_ERROR } from 'src/modules/country/enums/country.status-code.enum';
import { CountryService } from 'src/modules/country/services/country.service';
import { ENUM_SEND_EMAIL_PROCESS } from 'src/modules/email/enums/email.enum';
import { ENUM_PASSWORD_HISTORY_TYPE } from 'src/modules/password-history/enums/password-history.enum';
import { PasswordHistoryService } from 'src/modules/password-history/services/password-history.service';
import { ENUM_ROLE_STATUS_CODE_ERROR } from 'src/modules/role/enums/role.status-code.enum';
import { RoleService } from 'src/modules/role/services/role.service';
import { SessionService } from 'src/modules/session/services/session.service';
import { ENUM_USER_STATUS } from 'src/modules/user/enums/user.enum';
import { ENUM_USER_STATUS_CODE_ERROR } from 'src/modules/user/enums/user.status-code.enum';
import { UserEntity } from 'src/modules/user/repository/entities/user.entity';
import { UserService } from 'src/modules/user/services/user.service';
import { VerificationService } from 'src/modules/verification/services/verification.service';

@ApiTags('modules.public.auth')
@Controller({
    version: '1',
    path: '/auth',
})
export class AuthPublicController {
    private readonly logger = new Logger(AuthPublicController.name, {
        timestamp: true,
    });
    constructor(
        private readonly em: EntityManager,
        private readonly cloudTasksClient: CloudTasksQueueClient,
        private readonly userService: UserService,
        private readonly authService: AuthService,
        private readonly countryService: CountryService,
        private readonly roleService: RoleService,
        private readonly passwordHistoryService: PasswordHistoryService,
        private readonly verificationService: VerificationService,
        private readonly sessionService: SessionService,
        private readonly activityService: ActivityService,
        private readonly messageService: MessageService,
        private readonly turnstileService: TurnstileService
    ) {}

    @AuthPublicLoginCredentialDoc()
    @Response('auth.loginWithCredential')
    @ApiKeyProtected()
    @HttpCode(HttpStatus.OK)
    @Post('/login/credential')
    async loginWithCredential(
        @Body()
        { email, password, turnstileToken, rememberMe }: AuthLoginRequestDto,
        @Req() request: IRequestApp,
        @Res({ passthrough: true }) res: ExpressResponse
    ): Promise<IResponse<AuthLoginResponseDto>> {
        // Before any user lookup, so bots get no enumeration signal.
        await this.turnstileService.verify(
            turnstileToken,
            ENUM_TURNSTILE_ACTION.LOGIN
        );

        let user: UserEntity = await this.userService.findOneByEmail(email);
        if (!user) {
            throw new NotFoundException({
                statusCode: ENUM_USER_STATUS_CODE_ERROR.NOT_FOUND,
                message: 'user.error.notFound',
            });
        }

        const passwordAttempt: boolean = this.authService.getPasswordAttempt();
        const passwordMaxAttempt: number =
            this.authService.getPasswordMaxAttempt();
        if (passwordAttempt && user.passwordAttempt >= passwordMaxAttempt) {
            throw new ForbiddenException({
                statusCode: ENUM_USER_STATUS_CODE_ERROR.PASSWORD_ATTEMPT_MAX,
                message: 'auth.error.passwordAttemptMax',
            });
        }

        const validate: boolean = this.authService.validateUser(
            password,
            user.password
        );
        if (!validate) {
            user = await this.userService.increasePasswordAttempt(user);

            throw new BadRequestException({
                statusCode: ENUM_USER_STATUS_CODE_ERROR.PASSWORD_NOT_MATCH,
                message: 'auth.error.passwordNotMatch',
                data: {
                    attempt: user.passwordAttempt,
                },
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

        const userWithRole: UserEntity = await this.userService.join(user);
        if (!userWithRole.role.isActive) {
            throw new ForbiddenException({
                statusCode: ENUM_ROLE_STATUS_CODE_ERROR.INACTIVE_FORBIDDEN,
                message: 'role.error.inactive',
            });
        } else if (userWithRole.verification.email !== true) {
            throw new ForbiddenException({
                statusCode: ENUM_USER_STATUS_CODE_ERROR.EMAIL_NOT_VERIFIED,
                message: 'user.error.emailNotVerified',
            });
        }

        await this.userService.resetPasswordAttempt(user);

        const checkPasswordExpired: boolean =
            this.authService.checkPasswordExpired(user.passwordExpired);
        if (checkPasswordExpired) {
            throw new ForbiddenException({
                statusCode: ENUM_USER_STATUS_CODE_ERROR.PASSWORD_EXPIRED,
                message: 'auth.error.passwordExpired',
            });
        }

        const databaseSession = this.em.fork();
        await databaseSession.begin();

        try {
            const session = await this.sessionService.create(
                request,
                {
                    user: user.id,
                },
                { em: databaseSession }
            );

            await this.sessionService.setLoginSession(userWithRole, session);

            const token = this.authService.createToken(
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

            await this.activityService.createByUser(user, {
                action: ENUM_ACTIVITY_ACTION.CREATE,
                subject: ENUM_POLICY_SUBJECT.AUTH,
                metadata: {
                    id: user.id,
                    name: user.email,
                },
            });

            return {
                data: token,
            };
        } catch (err: unknown) {
            try {
                await databaseSession.rollback();
            } catch {
                /* ignore rollback error */
            }
            this.logger.error(
                `Error during login with credential for user [${user.id}]: ${err}`,
                err instanceof Error ? err.stack : undefined
            );

            throw new InternalServerErrorException({
                statusCode: ENUM_APP_STATUS_CODE_ERROR.UNKNOWN,
                message: 'http.serverError.internalServerError',
                _error: err,
            });
        }
    }

    @AuthPublicLoginSocialGoogleDoc()
    @Response('auth.loginWithSocialGoogle')
    @AuthSocialGoogleProtected()
    @Post('/login/social/google')
    async loginWithGoogle(
        @AuthJwtPayload<IAuthSocialGooglePayload>('email')
        email: string,
        @Req() request: IRequestApp
    ): Promise<IResponse<AuthLoginResponseDto>> {
        const user: UserEntity = await this.userService.findOneByEmail(email);
        if (!user) {
            throw new NotFoundException({
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

        const userWithRole: UserEntity = await this.userService.join(user);
        if (!userWithRole.role.isActive) {
            throw new ForbiddenException({
                statusCode: ENUM_ROLE_STATUS_CODE_ERROR.INACTIVE_FORBIDDEN,
                message: 'role.error.inactive',
            });
        } else if (userWithRole.verification.email !== true) {
            throw new ForbiddenException({
                statusCode: ENUM_USER_STATUS_CODE_ERROR.EMAIL_NOT_VERIFIED,
                message: 'user.error.emailNotVerified',
            });
        }

        await this.userService.resetPasswordAttempt(user);

        const checkPasswordExpired: boolean =
            this.authService.checkPasswordExpired(user.passwordExpired);
        if (checkPasswordExpired) {
            throw new ForbiddenException({
                statusCode: ENUM_USER_STATUS_CODE_ERROR.PASSWORD_EXPIRED,
                message: 'auth.error.passwordExpired',
            });
        }

        const databaseSession = this.em.fork();
        await databaseSession.begin();

        try {
            const session = await this.sessionService.create(
                request,
                {
                    user: user.id,
                },
                { em: databaseSession }
            );

            await this.sessionService.setLoginSession(userWithRole, session);

            await databaseSession.commit();

            await this.activityService.createByUser(user, {
                action: ENUM_ACTIVITY_ACTION.CREATE,
                subject: ENUM_POLICY_SUBJECT.AUTH,
                metadata: {
                    id: user.id,
                    name: user.email,
                },
            });

            const token = this.authService.createToken(
                userWithRole,
                session.id
            );

            return {
                data: token,
            };
        } catch (err: unknown) {
            try {
                await databaseSession.rollback();
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

    @AuthPublicLoginSocialAppleDoc()
    @Response('user.loginWithSocialApple')
    @AuthSocialAppleProtected()
    @Post('/login/social/apple')
    async loginWithApple(
        @AuthJwtPayload<IAuthSocialApplePayload>('email')
        email: string,
        @Req() request: IRequestApp
    ): Promise<IResponse<AuthLoginResponseDto>> {
        const user: UserEntity = await this.userService.findOneByEmail(email);
        if (!user) {
            throw new NotFoundException({
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

        const userWithRole: UserEntity = await this.userService.join(user);
        if (!userWithRole.role.isActive) {
            throw new ForbiddenException({
                statusCode: ENUM_ROLE_STATUS_CODE_ERROR.INACTIVE_FORBIDDEN,
                message: 'role.error.inactive',
            });
        } else if (userWithRole.verification.email !== true) {
            throw new ForbiddenException({
                statusCode: ENUM_USER_STATUS_CODE_ERROR.EMAIL_NOT_VERIFIED,
                message: 'user.error.emailNotVerified',
            });
        }

        await this.userService.resetPasswordAttempt(user);

        const checkPasswordExpired: boolean =
            this.authService.checkPasswordExpired(user.passwordExpired);
        if (checkPasswordExpired) {
            throw new ForbiddenException({
                statusCode: ENUM_USER_STATUS_CODE_ERROR.PASSWORD_EXPIRED,
                message: 'auth.error.passwordExpired',
            });
        }

        const databaseSession = this.em.fork();
        await databaseSession.begin();

        try {
            const session = await this.sessionService.create(
                request,
                {
                    user: user.id,
                },
                { em: databaseSession }
            );
            await this.sessionService.setLoginSession(userWithRole, session);

            await databaseSession.commit();

            await this.activityService.createByUser(user, {
                action: ENUM_ACTIVITY_ACTION.CREATE,
                subject: ENUM_POLICY_SUBJECT.AUTH,
                metadata: {
                    id: user.id,
                    name: user.email,
                },
            });

            const token = this.authService.createToken(
                userWithRole,
                session.id
            );

            return {
                data: token,
            };
        } catch (err: unknown) {
            try {
                await databaseSession.rollback();
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

    @AuthPublicSignUpDoc()
    @Response('auth.signUp')
    @ApiKeyProtected()
    @Post('/sign-up')
    async signUp(
        @Body(new RequestEmailPipe())
        {
            email,
            name,
            password: passwordString,
            country,
            turnstileToken,
        }: AuthSignUpRequestDto
    ): Promise<IResponse<AuthSignUpResponseDto>> {
        // Before any user lookup, so bots get no enumeration signal.
        await this.turnstileService.verify(
            turnstileToken,
            ENUM_TURNSTILE_ACTION.SIGN_UP
        );

        const promises: Promise<any>[] = [
            this.roleService.findOneByName('individual'),
            this.userService.existByEmail(email),
            this.countryService.findOneById(country),
        ];

        const [role, emailExist, checkCountry] = await Promise.all(promises);

        if (!role) {
            throw new NotFoundException({
                statusCode: ENUM_ROLE_STATUS_CODE_ERROR.NOT_FOUND,
                message: 'role.error.notFound',
            });
        } else if (!checkCountry) {
            throw new NotFoundException({
                statusCode: ENUM_COUNTRY_STATUS_CODE_ERROR.NOT_FOUND,
                message: 'country.error.notFound',
            });
        } else if (emailExist) {
            throw new ConflictException({
                statusCode: ENUM_USER_STATUS_CODE_ERROR.EMAIL_EXIST,
                message: 'user.error.emailExist',
            });
        }

        const password = this.authService.createPassword(passwordString);

        const session = this.em.fork();
        await session.begin();

        try {
            const user = await this.userService.signUp(
                role.id,
                {
                    email,
                    name,
                    password: passwordString,
                    country,
                },
                password,
                { em: session }
            );

            const verification =
                await this.verificationService.createEmailByUser(user, {
                    em: session,
                });

            await this.passwordHistoryService.createByUser(
                user,
                {
                    type: ENUM_PASSWORD_HISTORY_TYPE.SIGN_UP,
                },
                { em: session }
            );

            await this.activityService.createByUser(
                user,
                {
                    action: ENUM_ACTIVITY_ACTION.CREATE,
                    subject: ENUM_POLICY_SUBJECT.USER,
                    metadata: {
                        user: {
                            _id: user.id,
                        },
                    },
                },
                { em: session }
            );

            await session.commit();

            // Await queueing so jobs are enqueued before the response (deterministic for
            // tests / graceful shutdown), but email failures must not fail sign-up
            // (Resend sandbox restriction in dev/E2E).
            try {
                await Promise.all([
                    this.cloudTasksClient.enqueue(
                        'email',
                        ENUM_SEND_EMAIL_PROCESS.WELCOME,
                        { send: { email, name } },
                        {
                            taskName: `${ENUM_SEND_EMAIL_PROCESS.WELCOME}-${user.id}-${verification.id}`,
                        }
                    ),
                    this.cloudTasksClient.enqueue(
                        'email',
                        ENUM_SEND_EMAIL_PROCESS.VERIFICATION,
                        {
                            send: { email, name },
                            data: {
                                otp: verification.otp,
                                expiredAt: verification.expiredDate,
                                reference: verification.reference,
                            },
                        },
                        {
                            taskName: `${ENUM_SEND_EMAIL_PROCESS.VERIFICATION}-${user.id}-${verification.id}`,
                        }
                    ),
                ]);
            } catch (err) {
                this.logger.warn(
                    'Email queue failed after sign-up (non-fatal):',
                    (err as Error)?.message
                );
            }

            return {
                data: {
                    userId: user.id.toString(),
                },
            };
        } catch (err) {
            this.logger.error('Error during sign up:', {
                name: (err as any)?.name,
                message: (err as any)?.message,
                entity: (err as any)?.entity?.constructor?.name,
                property: (err as any)?.property,
                stack: (err as any)?.stack,
            });
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
