import { ENUM_ACTIVITY_ACTION } from '@app/modules/activity/enums/activity.enum';
import { EntityManager } from '@mikro-orm/postgresql';
import {
    BadRequestException,
    Body,
    ConflictException,
    Controller,
    Delete,
    InternalServerErrorException,
    NotFoundException,
    Put,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ENUM_APP_STATUS_CODE_ERROR } from 'src/app/enums/app.status-code.enum';
import { MessageService } from 'src/common/message/services/message.service';
import { Response } from 'src/common/response/decorators/response.decorator';
import { ActivityService } from 'src/modules/activity/services/activity.service';
import { ApiKeyProtected } from 'src/modules/api-key/decorators/api-key.decorator';
import {
    AuthJwtAccessProtected,
    AuthJwtPayload,
} from 'src/modules/auth/decorators/auth.jwt.decorator';
import { ENUM_COUNTRY_STATUS_CODE_ERROR } from 'src/modules/country/enums/country.status-code.enum';
import { CountryService } from 'src/modules/country/services/country.service';
import { PolicyRoleProtected } from 'src/modules/policy/decorators/policy.decorator';
import {
    ENUM_POLICY_ROLE_TYPE,
    ENUM_POLICY_SUBJECT,
} from 'src/modules/policy/enums/policy.enum';
import { SessionService } from 'src/modules/session/services/session.service';
import { UserProtected } from 'src/modules/user/decorators/user.decorator';
import {
    UserUserDeleteDoc,
    UserUserUpdateMobileNumberDoc,
    UserUserUpdateUsernameDoc,
} from 'src/modules/user/docs/user.user.doc';
import { UserUpdateClaimUsernameRequestDto } from 'src/modules/user/dtos/request/user.update-claim-username.dto';
import { UserUpdateMobileNumberRequestDto } from 'src/modules/user/dtos/request/user.update-mobile-number.request.dto';
import { ENUM_USER_STATUS_CODE_ERROR } from 'src/modules/user/enums/user.status-code.enum';
import { UserParsePipe } from 'src/modules/user/pipes/user.parse.pipe';
import { UserEntity } from 'src/modules/user/repository/entities/user.entity';
import { UserService } from 'src/modules/user/services/user.service';

@ApiTags('modules.user.user')
@Controller({
    version: '1',
    path: '/user',
})
export class UserUserController {
    constructor(
        private readonly em: EntityManager,
        private readonly userService: UserService,
        private readonly activityService: ActivityService,
        private readonly messageService: MessageService,
        private readonly sessionService: SessionService,
        private readonly countryService: CountryService
    ) {}

    @UserUserDeleteDoc()
    @Response('user.delete')
    @PolicyRoleProtected(ENUM_POLICY_ROLE_TYPE.USER)
    @UserProtected([false])
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Delete('/delete')
    async delete(
        @AuthJwtPayload('user', UserParsePipe) user: UserEntity
    ): Promise<void> {
        const session = this.em.fork();
        await session.begin();

        try {
            await this.userService.softDelete(user, {
                em: session,
                actionBy: user.id,
            });

            await this.activityService.createByUser(
                user,
                {
                    action: ENUM_ACTIVITY_ACTION.DELETE,
                    subject: ENUM_POLICY_SUBJECT.USER,
                    metadata: { id: user.id, name: user.name },
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

        return;
    }

    @UserUserUpdateMobileNumberDoc()
    @Response('user.updateMobileNumber')
    @PolicyRoleProtected(ENUM_POLICY_ROLE_TYPE.USER)
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Put('/update/mobile-number')
    async updateMobileNumber(
        @AuthJwtPayload('user', UserParsePipe) user: UserEntity,
        @Body()
        { number, country }: UserUpdateMobileNumberRequestDto
    ): Promise<void> {
        const checkCountry = await this.countryService.findOneById(country);
        if (!checkCountry) {
            throw new NotFoundException({
                statusCode: ENUM_COUNTRY_STATUS_CODE_ERROR.NOT_FOUND,
                message: 'country.error.notFound',
            });
        }

        const checkValidMobileNumber = this.userService.checkMobileNumber(
            number,
            checkCountry
        );
        if (!checkValidMobileNumber) {
            throw new BadRequestException({
                statusCode: ENUM_USER_STATUS_CODE_ERROR.MOBILE_NUMBER_INVALID,
                message: 'user.error.mobileNumberInvalid',
            });
        }

        const session = this.em.fork();
        await session.begin();

        try {
            await this.userService.updateMobileNumber(user, {
                number,
                country,
            });
            await this.activityService.createByUser(
                user,
                {
                    action: ENUM_ACTIVITY_ACTION.UPDATE,
                    subject: ENUM_POLICY_SUBJECT.USER,
                    metadata: {
                        old: {
                            mobileNumber: user.mobileNumber,
                            country: user.country,
                        },
                        new: {
                            mobileNumber: number,
                            country: country,
                        },
                    },
                },
                { em: session }
            );

            await session.commit();
        } catch (err: unknown) {
            await session.rollback();

            throw new InternalServerErrorException({
                statusCode: ENUM_APP_STATUS_CODE_ERROR.UNKNOWN,
                message: 'http.serverError.internalServerError',
                _error: err,
            });
        }

        return;
    }

    @UserUserUpdateUsernameDoc()
    @Response('user.updateClaimUsername')
    @PolicyRoleProtected(ENUM_POLICY_ROLE_TYPE.USER)
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Put('/update/claim-username')
    async updateUsername(
        @AuthJwtPayload('user', UserParsePipe) user: UserEntity,
        @Body()
        { username }: UserUpdateClaimUsernameRequestDto
    ): Promise<void> {
        const checkUsername = this.userService.checkUsernamePattern(username);
        if (checkUsername) {
            throw new BadRequestException({
                statusCode: ENUM_USER_STATUS_CODE_ERROR.USERNAME_NOT_ALLOWED,
                message: 'user.error.usernameNotAllowed',
            });
        }

        const checkBadWord =
            await this.userService.checkUsernameBadWord(username);
        if (checkBadWord) {
            throw new BadRequestException({
                statusCode:
                    ENUM_USER_STATUS_CODE_ERROR.USERNAME_CONTAIN_BAD_WORD,
                message: 'user.error.usernameContainBadWord',
            });
        }

        const exist = await this.userService.existByUsername(username);
        if (exist) {
            throw new ConflictException({
                statusCode: ENUM_USER_STATUS_CODE_ERROR.USERNAME_EXIST,
                message: 'user.error.usernameExist',
            });
        }

        const session = this.em.fork();
        await session.begin();

        try {
            await this.userService.updateClaimUsername(
                user,
                { username },
                { em: session }
            );

            await this.activityService.createByUser(
                user,
                {
                    action: ENUM_ACTIVITY_ACTION.UPDATE,
                    subject: ENUM_POLICY_SUBJECT.USER,
                    metadata: {
                        old: {
                            username: user.username,
                        },
                        new: {
                            username: username,
                        },
                    },
                },
                { em: session }
            );

            await session.commit();
        } catch (err: unknown) {
            await session.rollback();

            throw new InternalServerErrorException({
                statusCode: ENUM_APP_STATUS_CODE_ERROR.UNKNOWN,
                message: 'http.serverError.internalServerError',
                _error: err,
            });
        }

        return;
    }
}
