import { ENUM_ACTIVITY_ACTION } from '@app/modules/activity/enums/activity.enum';
import {
    BadRequestException,
    Body,
    Controller,
    ForbiddenException,
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
    AuthSharedMfaSetupDoc,
} from 'src/modules/auth/docs/auth.shared.doc';
import { AuthMfaDisableRequestDto } from 'src/modules/auth/dtos/request/auth.mfa-disable.request.dto';
import { AuthMfaEnableRequestDto } from 'src/modules/auth/dtos/request/auth.mfa-enable.request.dto';
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
    @HttpCode(HttpStatus.OK)
    @Post('/setup')
    async setup(
        @AuthJwtPayload('user', UserParsePipe) user: UserEntity
    ): Promise<IResponse<AuthMfaSetupResponseDto>> {
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
        @Body() { code }: AuthMfaEnableRequestDto
    ): Promise<IResponse<AuthMfaEnableResponseDto>> {
        const result = await this.mfaService.enable(user, code);
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
        @Body() { password, code }: AuthMfaDisableRequestDto
    ): Promise<void> {
        if (!user.mfaEnabled) {
            throw new BadRequestException({
                statusCode: ENUM_AUTH_STATUS_CODE_ERROR.MFA_NOT_ENABLED,
                message: 'auth.error.mfaNotEnabled',
            });
        }
        if (
            this.authService.getPasswordAttempt() &&
            user.passwordAttempt >= this.authService.getPasswordMaxAttempt()
        ) {
            throw new ForbiddenException({
                statusCode: ENUM_USER_STATUS_CODE_ERROR.PASSWORD_ATTEMPT_MAX,
                message: 'auth.error.passwordAttemptMax',
            });
        }

        if (!(await this.authService.validateUser(password, user.password))) {
            await this.userService.increasePasswordAttempt(user);
            throw new BadRequestException({
                statusCode: ENUM_USER_STATUS_CODE_ERROR.PASSWORD_NOT_MATCH,
                message: 'auth.error.passwordNotMatch',
            });
        }
        if (!(await this.mfaService.verify(user, code))) {
            await this.userService.increasePasswordAttempt(user);
            throw this.mfaService.invalidCodeError();
        }

        await this.mfaService.disable(user);
        await this.userService.resetPasswordAttempt(user);
        await this.logActivity(user, 'disabled');
    }

    private async logActivity(
        user: UserEntity,
        mfa: 'enabled' | 'disabled'
    ): Promise<void> {
        await this.activityService.createByUser(user, {
            action: ENUM_ACTIVITY_ACTION.UPDATE,
            subject: ENUM_POLICY_SUBJECT.AUTH,
            metadata: { id: user.id, mfa },
        });
    }
}
