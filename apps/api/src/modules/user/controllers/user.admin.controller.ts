import { ENUM_ACTIVITY_ACTION } from '@app/modules/activity/enums/activity.enum';
import { CloudTasksQueueClient } from '@app/worker/cloud-tasks-queue.client';
import { EntityManager } from '@mikro-orm/postgresql';
import {
    BadRequestException,
    Body,
    ConflictException,
    Controller,
    Get,
    Logger,
    NotFoundException,
    Patch,
    Post,
    Put,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { DatabaseIdResponseDto } from 'src/common/database/dtos/response/database.id.response.dto';
import { MessageService } from 'src/common/message/services/message.service';
import {
    PaginationQuery,
    PaginationQueryFilterEqual,
    PaginationQueryFilterInEnum,
} from 'src/common/pagination/decorators/pagination.decorator';
import { PaginationListDto } from 'src/common/pagination/dtos/pagination.list.dto';
import { PaginationService } from 'src/common/pagination/services/pagination.service';
import { RequestRequiredPipe } from 'src/common/request/pipes/request.required.pipe';
import {
    Response,
    ResponsePaging,
} from 'src/common/response/decorators/response.decorator';
import {
    IResponse,
    IResponsePaging,
} from 'src/common/response/interfaces/response.interface';
import { ActivityService } from 'src/modules/activity/services/activity.service';
import { ApiKeyProtected } from 'src/modules/api-key/decorators/api-key.decorator';
import {
    AuthJwtAccessProtected,
    AuthJwtPayload,
} from 'src/modules/auth/decorators/auth.jwt.decorator';
import {
    IAuthJwtRefreshTokenPayload,
    IAuthPassword,
} from 'src/modules/auth/interfaces/auth.interface';
import { AuthService } from 'src/modules/auth/services/auth.service';
import { ENUM_COUNTRY_STATUS_CODE_ERROR } from 'src/modules/country/enums/country.status-code.enum';
import { CountryService } from 'src/modules/country/services/country.service';
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
import { ENUM_ROLE_STATUS_CODE_ERROR } from 'src/modules/role/enums/role.status-code.enum';
import { RoleService } from 'src/modules/role/services/role.service';
import {
    USER_DEFAULT_AVAILABLE_SEARCH,
    USER_DEFAULT_POLICY_ROLE_TYPE,
    USER_DEFAULT_STATUS,
} from 'src/modules/user/constants/user.list.constant';
import {
    UserParam,
    UserProtected,
} from 'src/modules/user/decorators/user.decorator';
import {
    UserAdminCreateDoc,
    UserAdminGetDoc,
    UserAdminListDoc,
    UserAdminUpdateDoc,
    UserAdminUpdateStatusDoc,
} from 'src/modules/user/docs/user.admin.doc';
import { UserCreateRequestDto } from 'src/modules/user/dtos/request/user.create.request.dto';
import { UserUpdateStatusRequestDto } from 'src/modules/user/dtos/request/user.update-status.request.dto';
import { UserUpdateRequestDto } from 'src/modules/user/dtos/request/user.update.request.dto';
import { UserListResponseDto } from 'src/modules/user/dtos/response/user.list.response.dto';
import { UserProfileResponseDto } from 'src/modules/user/dtos/response/user.profile.response.dto';
import {
    ENUM_USER_SIGN_UP_FROM,
    ENUM_USER_STATUS,
} from 'src/modules/user/enums/user.enum';
import { ENUM_USER_STATUS_CODE_ERROR } from 'src/modules/user/enums/user.status-code.enum';
import { UserNotSelfPipe } from 'src/modules/user/pipes/user.not-self.pipe';
import { UserParsePipe } from 'src/modules/user/pipes/user.parse.pipe';
import { UserEntity } from 'src/modules/user/repository/entities/user.entity';
import { UserService } from 'src/modules/user/services/user.service';
import { VerificationService } from 'src/modules/verification/services/verification.service';

@ApiTags('modules.admin.user')
@Controller({
    version: '1',
    path: '/user',
})
export class UserAdminController {
    private readonly logger = new Logger(UserAdminController.name, {
        timestamp: true,
    });

    constructor(
        private readonly em: EntityManager,
        private readonly cloudTasksClient: CloudTasksQueueClient,
        private readonly paginationService: PaginationService,
        private readonly roleService: RoleService,
        private readonly authService: AuthService,
        private readonly userService: UserService,
        private readonly countryService: CountryService,
        private readonly passwordHistoryService: PasswordHistoryService,
        private readonly activityService: ActivityService,
        private readonly verificationService: VerificationService
    ) {}

    @UserAdminListDoc()
    @ResponsePaging('user.list')
    @PolicyAbilityProtected({
        subject: ENUM_POLICY_SUBJECT.USER,
        action: [ENUM_POLICY_ACTION.READ],
    })
    @PolicyRoleProtected(ENUM_POLICY_ROLE_TYPE.ADMIN)
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Get('/list')
    async list(
        @PaginationQuery({
            availableSearch: USER_DEFAULT_AVAILABLE_SEARCH,
        })
        { _search, _limit, _offset, _order }: PaginationListDto,
        @PaginationQueryFilterInEnum(
            'status',
            USER_DEFAULT_STATUS,
            ENUM_USER_STATUS
        )
        status: Record<string, any>,
        @PaginationQueryFilterInEnum(
            'role.type',
            USER_DEFAULT_POLICY_ROLE_TYPE,
            ENUM_POLICY_ROLE_TYPE,
            {
                queryField: 'roleType',
            }
        )
        roleType: Record<string, any>,
        @PaginationQueryFilterEqual('country._id', {
            queryField: 'country',
        })
        country: Record<string, any>
    ): Promise<IResponsePaging<UserListResponseDto>> {
        const find: Record<string, any> = {
            ..._search,
            ...status,
            ...roleType,
            ...country,
        };

        const users: UserEntity[] =
            await this.userService.findAllWithRoleAndCountry(find, {
                limit: _limit,
                offset: _offset,
                order: _order,
            });
        const total: number =
            await this.userService.getTotalWithRoleAndCountry(find);
        const totalPage: number = this.paginationService.totalPage(
            total,
            _limit
        );

        const mapped = this.userService.mapList(users);

        return {
            _pagination: { total, totalPage },
            data: mapped,
        };
    }

    @UserAdminGetDoc()
    @Response('user.get')
    @PolicyAbilityProtected({
        subject: ENUM_POLICY_SUBJECT.USER,
        action: [ENUM_POLICY_ACTION.READ],
    })
    @PolicyRoleProtected(ENUM_POLICY_ROLE_TYPE.ADMIN)
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Get('/get/:user')
    async get(
        @UserParam('user', RequestRequiredPipe, UserParsePipe) user: UserEntity
    ): Promise<IResponse<UserProfileResponseDto>> {
        const userWithRole: UserEntity = await this.userService.join(user);
        const mapped: UserProfileResponseDto =
            this.userService.mapProfile(userWithRole);

        return { data: mapped };
    }

    @UserAdminCreateDoc()
    @Response('user.create')
    @PolicyAbilityProtected({
        subject: ENUM_POLICY_SUBJECT.USER,
        action: [ENUM_POLICY_ACTION.READ, ENUM_POLICY_ACTION.CREATE],
    })
    @PolicyRoleProtected(ENUM_POLICY_ROLE_TYPE.ADMIN)
    @UserProtected()
    @AuthJwtAccessProtected()
    @Post('/create')
    async create(
        @AuthJwtPayload('user') createBy: string,
        @Body()
        { email, role, name, country, gender }: UserCreateRequestDto
    ): Promise<IResponse<DatabaseIdResponseDto>> {
        const promises: Promise<any>[] = [
            this.roleService.findOneById(role),
            this.userService.existByEmail(email),
            this.countryService.findOneById(country),
        ];

        const [checkRole, emailExist, checkCountry] =
            await Promise.all(promises);

        if (!checkRole) {
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

        const passwordString = this.authService.createPasswordRandom();
        const password: IAuthPassword = this.authService.createPassword(
            passwordString,
            {
                temporary: true,
            }
        );

        const result = await this.em.transactional(async _em => {
            const created = await this.userService.create(
                {
                    email,
                    country,
                    role,
                    name,
                    gender,
                },
                password,
                ENUM_USER_SIGN_UP_FROM.ADMIN
            );

            const verification =
                await this.verificationService.createEmailByUser(created);

            await this.passwordHistoryService.createByAdmin(created, {
                by: createBy,
                type: ENUM_PASSWORD_HISTORY_TYPE.SIGN_UP,
            });

            await this.activityService.createByAdmin(created, createBy, {
                action: ENUM_ACTIVITY_ACTION.CREATE,
                subject: ENUM_POLICY_SUBJECT.USER,
                metadata: {
                    user: {
                        id: created.id,
                    },
                },
            });

            try {
                await Promise.all([
                    this.cloudTasksClient.enqueue(
                        'email',
                        ENUM_SEND_EMAIL_PROCESS.CREATE,
                        {
                            send: { email: created.email, name: created.name },
                            data: {
                                passwordExpiredAt: password.passwordExpired,
                                password: passwordString,
                            },
                        },
                        {
                            taskName: `${ENUM_SEND_EMAIL_PROCESS.CREATE}-${created.id}`,
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
                            taskName: `${ENUM_SEND_EMAIL_PROCESS.VERIFICATION}-${created.id}`,
                        }
                    ),
                ]);
            } catch (err) {
                this.logger.warn(
                    `Email queue failed after admin user create [userId=${created.id}, jobs=${ENUM_SEND_EMAIL_PROCESS.CREATE},${ENUM_SEND_EMAIL_PROCESS.VERIFICATION}] (non-fatal):`,
                    (err as Error)?.message
                );
            }

            return {
                data: { id: created.id },
            };
        });

        return result;
    }

    @UserAdminUpdateDoc()
    @Response('user.update')
    @PolicyAbilityProtected({
        subject: ENUM_POLICY_SUBJECT.USER,
        action: [ENUM_POLICY_ACTION.READ, ENUM_POLICY_ACTION.UPDATE],
    })
    @PolicyRoleProtected(ENUM_POLICY_ROLE_TYPE.ADMIN)
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Put('/update/:user')
    async update(
        @UserParam('user', RequestRequiredPipe, UserParsePipe, UserNotSelfPipe)
        user: UserEntity,
        @AuthJwtPayload<IAuthJwtRefreshTokenPayload>()
        { user: userFromPayload }: IAuthJwtRefreshTokenPayload,
        @Body() { name, country, role, gender }: UserUpdateRequestDto
    ): Promise<void> {
        const checkRole = await this.roleService.findOneActiveById(role);
        if (!checkRole) {
            throw new NotFoundException({
                statusCode: ENUM_ROLE_STATUS_CODE_ERROR.NOT_FOUND,
                message: 'role.error.notFound',
            });
        }

        const checkCountry = await this.countryService.findOneById(country);
        if (!checkCountry) {
            throw new NotFoundException({
                statusCode: ENUM_COUNTRY_STATUS_CODE_ERROR.NOT_FOUND,
                message: 'country.error.notFound',
            });
        }

        await this.em.transactional(async em => {
            await this.userService.update(user, {
                name,
                country,
                role,
                gender,
            });

            await this.activityService.createByAdmin(user, userFromPayload, {
                action: ENUM_ACTIVITY_ACTION.UPDATE,
                subject: ENUM_POLICY_SUBJECT.USER,
                metadata: {
                    old: {
                        name: user.name,
                        country: user.country,
                        role: user.role,
                        gender: user.gender,
                    },
                    new: {
                        name,
                        country,
                        role,
                        gender,
                    },
                },
            });
        });
    }

    @UserAdminUpdateStatusDoc()
    @Response('user.updateStatus')
    @PolicyAbilityProtected({
        subject: ENUM_POLICY_SUBJECT.USER,
        action: [ENUM_POLICY_ACTION.READ, ENUM_POLICY_ACTION.UPDATE],
    })
    @PolicyRoleProtected(ENUM_POLICY_ROLE_TYPE.ADMIN)
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Patch('/update/:user/status')
    async updateStatus(
        @UserParam('user', RequestRequiredPipe, UserParsePipe, UserNotSelfPipe)
        user: UserEntity,
        @Body() { status }: UserUpdateStatusRequestDto,
        @AuthJwtPayload<IAuthJwtRefreshTokenPayload>()
        { user: userFromPayload }: IAuthJwtRefreshTokenPayload
    ): Promise<IResponse<void>> {
        if (user.status === ENUM_USER_STATUS.BLOCKED) {
            throw new BadRequestException({
                statusCode: ENUM_USER_STATUS_CODE_ERROR.STATUS_INVALID,
                message: 'user.error.statusInvalid',
                _metadata: {
                    customProperty: {
                        messageProperties: {
                            status: status.toLowerCase(),
                        },
                    },
                },
            });
        }

        await this.em.transactional(async () => {
            await this.userService.updateStatus(user, { status });

            await this.activityService.createByAdmin(user, userFromPayload, {
                action: ENUM_ACTIVITY_ACTION.UPDATE,
                subject: ENUM_POLICY_SUBJECT.USER,
                metadata: {
                    old: {
                        status: user.status,
                    },
                    new: {
                        status,
                    },
                },
            });

            if (status === ENUM_USER_STATUS.BLOCKED) {
                try {
                    await this.cloudTasksClient.enqueue(
                        'email',
                        ENUM_SEND_EMAIL_PROCESS.ACCOUNT_BANNED,
                        {
                            send: { email: user.email, name: user.name },
                        },
                        {
                            taskName: `${ENUM_SEND_EMAIL_PROCESS.ACCOUNT_BANNED}-${user.id}`,
                        }
                    );
                } catch (err) {
                    this.logger.warn(
                        `Email queue failed after banning user [userId=${user.id}, job=${ENUM_SEND_EMAIL_PROCESS.ACCOUNT_BANNED}] (non-fatal):`,
                        (err as Error)?.message
                    );
                }
            }
        });

        return {
            _metadata: {
                customProperty: {
                    messageProperties: {
                        status: status.toLowerCase(),
                    },
                },
            },
        };
    }
}
