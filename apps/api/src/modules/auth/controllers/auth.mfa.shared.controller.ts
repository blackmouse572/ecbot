import { ENUM_ACTIVITY_ACTION } from '@app/modules/activity/enums/activity.enum';
import {
    BadRequestException,
    Body,
    Controller,
    ForbiddenException,
    Headers,
    HttpCode,
    HttpStatus,
    Post,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Response } from 'src/common/response/decorators/response.decorator';
import { IResponse } from 'src/common/response/interfaces/response.interface';
import { ActivityService } from 'src/modules/activity/services/activity.service';
import { ApiKeyProtected } from 'src/modules/api-key/decorators/api-key.decorator';
import {
    AuthJwtAccessProtected,
    AuthJwtPayload,
} from 'src/modules/auth/decorators/auth.jwt.decorator';
import {
    AuthSharedMfaDisableDoc,
    AuthSharedMfaEnableDoc,
    AuthSharedMfaRecoveryCodesDoc,
    AuthSharedMfaSetupDoc,
} from 'src/modules/auth/docs/auth.shared.doc';
import { AuthMfaDisableRequestDto } from 'src/modules/auth/dtos/request/auth.mfa-disable.request.dto';
import { AuthMfaEnableRequestDto } from 'src/modules/auth/dtos/request/auth.mfa-enable.request.dto';
import { AuthMfaRecoveryCodesRequestDto } from 'src/modules/auth/dtos/request/auth.mfa-recovery-codes.request.dto';
import { AuthMfaSetupRequestDto } from 'src/modules/auth/dtos/request/auth.mfa-setup.request.dto';
import { AuthMfaEnableResponseDto } from 'src/modules/auth/dtos/response/auth.mfa-enable.response.dto';
import { AuthMfaSetupResponseDto } from 'src/modules/auth/dtos/response/auth.mfa-setup.response.dto';
import { ENUM_AUTH_STATUS_CODE_ERROR } from 'src/modules/auth/enums/auth.status-code.enum';
import { AuthService } from 'src/modules/auth/services/auth.service';
import { MfaService } from 'src/modules/auth/services/mfa.service';
import { ENUM_POLICY_SUBJECT } from 'src/modules/policy/enums/policy.enum';
import { UserProtected } from 'src/modules/user/decorators/user.decorator';
import { ENUM_USER_STATUS_CODE_ERROR } from 'src/modules/user/enums/user.status-code.enum';
import { UserParsePipe } from 'src/modules/user/pipes/user.parse.pipe';
import { UserEntity } from 'src/modules/user/repository/entities/user.entity';
import { UserService } from 'src/modules/user/services/user.service';

@ApiTags('modules.shared.auth')
@Controller({
    version: '1',
    path: '/auth/mfa',
})
export class AuthMfaSharedController {
    constructor(
        private readonly authService: AuthService,
        private readonly mfaService: MfaService,
        private readonly userService: UserService,
        private readonly activityService: ActivityService
    ) {}

    @AuthSharedMfaSetupDoc()
    @Response('auth.mfaSetup')
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Throttle({ default: { ttl: 60000, limit: 5 } })
    @HttpCode(HttpStatus.OK)
    @Post('/setup')
    async setup(
        @AuthJwtPayload('user', UserParsePipe) user: UserEntity,
        @Body() { password }: AuthMfaSetupRequestDto
    ): Promise<IResponse<AuthMfaSetupResponseDto>> {
        await this.checkCredentials(user, password);
        return { data: await this.mfaService.setup(user) };
    }

    @AuthSharedMfaEnableDoc()
    @Response('auth.mfaEnable')
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Throttle({ default: { ttl: 60000, limit: 5 } })
    @HttpCode(HttpStatus.OK)
    @Post('/enable')
    async enable(
        @AuthJwtPayload('user', UserParsePipe) user: UserEntity,
        @AuthJwtPayload('session') session: string,
        @Body() { password, code }: AuthMfaEnableRequestDto,
        @Headers('x-custom-lang') language?: string
    ): Promise<IResponse<AuthMfaEnableResponseDto>> {
        const result = await this.checkCredentials(user, password, () =>
            this.mfaService.enable(user, code)
        );
        await this.mfaService.revokeSessionsAndNotify(user, true, {
            keepSession: session,
            language,
        });
        await this.logActivity(user, 'enabled');
        return { data: result };
    }

    @AuthSharedMfaDisableDoc()
    @Response('auth.mfaDisable')
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Throttle({ default: { ttl: 60000, limit: 5 } })
    @HttpCode(HttpStatus.OK)
    @Post('/disable')
    async disable(
        @AuthJwtPayload('user', UserParsePipe) user: UserEntity,
        @AuthJwtPayload('session') session: string,
        @Body() { password, code }: AuthMfaDisableRequestDto,
        @Headers('x-custom-lang') language?: string
    ): Promise<void> {
        this.assertEnabled(user);
        await this.checkCredentials(user, password, () =>
            this.verifyCode(user, code)
        );

        await this.mfaService.disable(user);
        await this.mfaService.revokeSessionsAndNotify(user, false, {
            keepSession: session,
            language,
        });
        await this.logActivity(user, 'disabled');
    }

    @AuthSharedMfaRecoveryCodesDoc()
    @Response('auth.mfaRecoveryCodes')
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Throttle({ default: { ttl: 60000, limit: 5 } })
    @HttpCode(HttpStatus.OK)
    @Post('/recovery-codes')
    async regenerateRecoveryCodes(
        @AuthJwtPayload('user', UserParsePipe) user: UserEntity,
        @Body() { password, code }: AuthMfaRecoveryCodesRequestDto
    ): Promise<IResponse<AuthMfaEnableResponseDto>> {
        this.assertEnabled(user);
        await this.checkCredentials(user, password, () =>
            this.verifyCode(user, code)
        );

        const result = await this.mfaService.regenerateRecoveryCodes(user);
        await this.logActivity(user, 'recovery_codes_regenerated');
        return { data: result };
    }

    /**
     * Claims one guess before checking the password (and `check`, when
     * given), so parallel requests cannot pass the lockout. Wrong guesses
     * keep their claim; a full success clears the count.
     */
    private async checkCredentials<T>(
        user: UserEntity,
        password: string,
        check?: () => Promise<T>
    ): Promise<T | undefined> {
        if (
            this.authService.getPasswordAttempt() &&
            !(await this.userService.claimPasswordAttempt(
                user,
                this.authService.getPasswordMaxAttempt()
            ))
        ) {
            throw new ForbiddenException({
                statusCode: ENUM_USER_STATUS_CODE_ERROR.PASSWORD_ATTEMPT_MAX,
                message: 'auth.error.passwordAttemptMax',
            });
        }

        if (!(await this.authService.validateUser(password, user.password))) {
            throw new BadRequestException({
                statusCode: ENUM_USER_STATUS_CODE_ERROR.PASSWORD_NOT_MATCH,
                message: 'auth.error.passwordNotMatch',
            });
        }
        const result = check ? await check() : undefined;

        await this.userService.clearPasswordAttempt(user);
        return result;
    }

    private async verifyCode(user: UserEntity, code: string): Promise<void> {
        if (!(await this.mfaService.verify(user, code))) {
            throw this.mfaService.invalidCodeError();
        }
    }

    private assertEnabled(user: UserEntity): void {
        if (!user.mfaEnabled) {
            throw new BadRequestException({
                statusCode: ENUM_AUTH_STATUS_CODE_ERROR.MFA_NOT_ENABLED,
                message: 'auth.error.mfaNotEnabled',
            });
        }
    }

    private async logActivity(
        user: UserEntity,
        mfa: 'enabled' | 'disabled' | 'recovery_codes_regenerated'
    ): Promise<void> {
        await this.activityService.createByUser(user, {
            action: ENUM_ACTIVITY_ACTION.UPDATE,
            subject: ENUM_POLICY_SUBJECT.AUTH,
            metadata: { id: user.id, mfa },
        });
    }
}
