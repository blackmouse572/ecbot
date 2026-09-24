import { CountryEntity } from '@app/modules/country/repository/entities/country.entity';
import { RoleEntity } from '@app/modules/role/repository/entities/role.entity';
import { EntityManager, FilterQuery, InferEntity } from '@mikro-orm/postgresql';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { plainToInstance } from 'class-transformer';
import { randomUUID } from 'crypto';
import {
    ENUM_FILE_MIME_IMAGE,
    EXTENSION_BY_MIME_IMAGE,
} from 'src/common/file/enums/file.enum';
import {
    IDatabaseCreateOptions,
    IDatabaseDeleteOptions,
    IDatabaseFindAllOptions,
    IDatabaseFindOneOptions,
    IDatabaseGetTotalOptions,
    IDatabaseUpdateOptions,
} from 'src/common/database/interfaces/database.interface';
import { HelperAvatarService } from 'src/common/helper/services/helper.avatar.service';
import { HelperDateService } from 'src/common/helper/services/helper.date.service';
import { HelperStringService } from 'src/common/helper/services/helper.string.service';
import { AuthSignUpRequestDto } from 'src/modules/auth/dtos/request/auth.sign-up.request.dto';
import { IAuthPassword } from 'src/modules/auth/interfaces/auth.interface';
import { AwsS3Dto } from 'src/modules/aws/dtos/aws.s3.dto';
import { UserCreateRequestDto } from 'src/modules/user/dtos/request/user.create.request.dto';
import { UserUpdateClaimUsernameRequestDto } from 'src/modules/user/dtos/request/user.update-claim-username.dto';
import { UserUpdateMobileNumberRequestDto } from 'src/modules/user/dtos/request/user.update-mobile-number.request.dto';
import { UserUpdatePasswordAttemptRequestDto } from 'src/modules/user/dtos/request/user.update-password-attempt.request.dto';
import { UserUpdateProfileRequestDto } from 'src/modules/user/dtos/request/user.update-profile.dto';
import { UserUpdateStatusRequestDto } from 'src/modules/user/dtos/request/user.update-status.request.dto';
import { UserUpdateRequestDto } from 'src/modules/user/dtos/request/user.update.request.dto';
import { UserCensorResponseDto } from 'src/modules/user/dtos/response/user.censor.response.dto';
import { UserGetResponseDto } from 'src/modules/user/dtos/response/user.get.response.dto';
import { UserListResponseDto } from 'src/modules/user/dtos/response/user.list.response.dto';
import { UserProfileResponseDto } from 'src/modules/user/dtos/response/user.profile.response.dto';
import { UserShortResponseDto } from 'src/modules/user/dtos/response/user.short.response.dto';
import {
    ENUM_USER_SIGN_UP_FROM,
    ENUM_USER_STATUS,
} from 'src/modules/user/enums/user.enum';
import { UserEntity } from 'src/modules/user/repository/entities/user.entity';
import { UserRepository } from 'src/modules/user/repository/repositories/user.repository';

@Injectable()
export class UserService {
    private readonly usernamePrefix: string;
    private readonly usernamePattern: RegExp;

    constructor(
        private readonly userRepository: UserRepository,
        private readonly em: EntityManager,
        private readonly helperDateService: HelperDateService,
        private readonly configService: ConfigService,
        private readonly helperStringService: HelperStringService,
        private readonly helperAvatarService: HelperAvatarService
    ) {
        this.usernamePrefix = this.configService.get<string>(
            'user.usernamePrefix'
        );
        this.usernamePattern = this.configService.get<RegExp>(
            'user.usernamePattern'
        );
    }

    async findAll(
        find?: Record<string, any>,
        options?: IDatabaseFindAllOptions
    ): Promise<UserEntity[]> {
        const findOptions: any = {};

        if (options?.limit) findOptions.limit = options.limit;
        if (options?.offset) findOptions.offset = options.offset;
        if (options?.orderBy) findOptions.orderBy = options.orderBy;
        if (options?.populate) findOptions.populate = options.populate;

        const em = options?.em || this.em;
        return em.find(UserEntity, find || {}, findOptions);
    }

    async getTotal(
        find?: Record<string, any>,
        options?: IDatabaseGetTotalOptions
    ): Promise<number> {
        const em = options?.em || this.em;
        return em.count(UserEntity, find || {});
    }

    async findOneById(
        id: string,
        options?: IDatabaseFindOneOptions
    ): Promise<UserEntity | null> {
        const findOptions: any = {};

        if (options?.populate) findOptions.populate = options.populate;
        if (options?.order) findOptions.orderBy = options.order;

        const em = options?.em || this.em;
        return em.findOne(UserEntity, { id }, findOptions);
    }

    async findOne(
        find: Record<string, any>,
        options?: IDatabaseFindOneOptions
    ): Promise<UserEntity | null> {
        const findOptions: any = {};

        if (options?.populate) findOptions.populate = options.populate;
        if (options?.order) findOptions.orderBy = options.order;

        const em = options?.em || this.em;
        return em.findOne(UserEntity, find, findOptions);
    }

    async findOneByEmail(
        email: string,
        options?: IDatabaseFindOneOptions
    ): Promise<UserEntity | null> {
        const findOptions: any = {};

        if (options?.populate) findOptions.populate = options.populate;
        if (options?.order) findOptions.orderBy = options.order;

        const em = options?.em || this.em;
        return em.findOne(
            UserEntity,
            {
                email: email.toLowerCase(),
            },
            findOptions
        );
    }

    async findOneByUsername(
        username: string,
        options?: IDatabaseFindOneOptions
    ): Promise<UserEntity | null> {
        const findOptions: any = {};

        if (options?.populate) findOptions.populate = options.populate;
        if (options?.order) findOptions.orderBy = options.order;

        const em = options?.em || this.em;
        return em.findOne(
            UserEntity,
            {
                username: { $ilike: username },
            },
            findOptions
        );
    }

    async findOneByMobileNumberAndCountry(
        country: string,
        mobileNumber: string,
        options?: IDatabaseFindOneOptions
    ): Promise<UserEntity | null> {
        const findOptions: any = {};

        if (options?.populate) findOptions.populate = options.populate;
        if (options?.order) findOptions.orderBy = options.order;

        const em = options?.em || this.em;
        return em.findOne(
            UserEntity,
            {
                mobileNumber: {
                    number: mobileNumber,
                    country: country,
                },
            },
            findOptions
        );
    }

    async findOneByMobileNumber(
        mobileNumber: string,
        options?: IDatabaseFindOneOptions
    ): Promise<UserEntity | null> {
        const findOptions: any = {};

        if (options?.populate) findOptions.populate = options.populate;
        if (options?.order) findOptions.orderBy = options.order;

        const em = options?.em || this.em;
        return em.findOne(
            UserEntity,
            {
                mobileNumber: { number: mobileNumber },
            },
            findOptions
        );
    }

    async findOneByMobileNumberOrEmail(
        mobileNumber: string,
        email: string,
        options?: IDatabaseFindOneOptions
    ): Promise<UserEntity | null> {
        const findOptions: any = {};

        if (options?.populate) findOptions.populate = options.populate;
        if (options?.order) findOptions.orderBy = options.order;

        const em = options?.em || this.em;
        return em.findOne(
            UserEntity,
            {
                $or: [
                    { mobileNumber: { number: mobileNumber } },
                    { email: email },
                ],
            },
            findOptions
        );
    }

    async findOneWithRoleAndCountry(
        find?: Record<string, any>,
        options?: IDatabaseFindOneOptions
    ): Promise<UserEntity | null> {
        const findOptions: any = {};

        if (options?.populate) findOptions.populate = options.populate;
        if (options?.order) findOptions.orderBy = options.order;

        const em = options?.em || this.em;
        return em.findOne(UserEntity, find, findOptions);
    }

    async findAllWithRoleAndCountry(
        find?: Record<string, any>,
        options?: IDatabaseFindAllOptions
    ): Promise<UserEntity[]> {
        const findOptions: any = {};

        if (options?.limit) findOptions.limit = options.limit;
        if (options?.offset) findOptions.offset = options.offset;
        if (options?.orderBy) findOptions.orderBy = options.orderBy;
        // role/country aren't eager relations — populate them (and
        // role.permissions, read via RoleListResponseDto's transform) by
        // default so callers actually get what this method's name promises.
        findOptions.populate = options?.populate ?? [
            'role',
            'role.permissions',
            'country',
        ];

        const em = options?.em || this.em;
        return em.find(UserEntity, find || {}, findOptions);
    }

    async getTotalWithRoleAndCountry(
        find?: Record<string, any>,
        options?: IDatabaseGetTotalOptions
    ): Promise<number> {
        const em = options?.em || this.em;
        return em.count(UserEntity, find || {});
    }

    async findByEmailOrMobileNumber(
        emailOrMobileNumber: string,
        options?: IDatabaseFindOneOptions
    ): Promise<UserEntity | null> {
        const findOptions: any = {};

        if (options?.populate) findOptions.populate = options.populate;
        if (options?.order) findOptions.orderBy = options.order;

        const em = options?.em || this.em;
        return em.findOne(
            UserEntity,
            {
                $or: [
                    { email: emailOrMobileNumber.toLowerCase() },
                    { mobileNumber: { number: emailOrMobileNumber } },
                ],
            },
            findOptions
        );
    }

    async findByEmailOrUsername(
        emailOrUsername: string,
        options?: IDatabaseFindOneOptions
    ): Promise<UserEntity | null> {
        const findOptions: any = {};

        if (options?.populate) findOptions.populate = options.populate;
        if (options?.order) findOptions.orderBy = options.order;

        const em = options?.em || this.em;
        return em.findOne(
            UserEntity,
            {
                $or: [
                    { email: emailOrUsername.toLowerCase() },
                    { username: { $ilike: emailOrUsername } },
                ],
            },
            findOptions
        );
    }

    async findByMobileNumberOrUsername(
        mobileNumberOrUsername: string,
        options?: IDatabaseFindOneOptions
    ): Promise<UserEntity | null> {
        const findOptions: any = {};

        if (options?.populate) findOptions.populate = options.populate;
        if (options?.order) findOptions.orderBy = options.order;

        const em = options?.em || this.em;
        return em.findOne(
            UserEntity,
            {
                $or: [
                    { mobileNumber: { number: mobileNumberOrUsername } },
                    { username: { $ilike: mobileNumberOrUsername } },
                ],
            },
            findOptions
        );
    }

    async checkExist(
        email: string,
        mobileNumber?: string,
        options?: IDatabaseFindOneOptions
    ): Promise<boolean> {
        const filters: any[] = [{ email: email.toLowerCase() }];

        if (mobileNumber) {
            filters.push({ mobileNumber: { number: mobileNumber } });
        }

        const findOptions: any = {};
        if (options?.populate) findOptions.populate = options.populate;

        const em = options?.em || this.em;
        const user = await em.findOne(
            UserEntity,
            {
                $or: filters,
            },
            findOptions
        );

        return !!user;
    }

    async existByEmail(
        email: string,
        options?: IDatabaseFindOneOptions
    ): Promise<boolean> {
        const findOptions: any = {};
        if (options?.populate) findOptions.populate = options.populate;

        const em = options?.em || this.em;
        const user = await em.findOne(
            UserEntity,
            {
                email: email.toLowerCase(),
            },
            findOptions
        );
        return !!user;
    }

    async existByMobileNumber(
        mobileNumber: string,
        options?: IDatabaseFindOneOptions
    ): Promise<boolean> {
        const findOptions: any = {};
        if (options?.populate) findOptions.populate = options.populate;

        const em = options?.em || this.em;
        const user = await em.findOne(
            UserEntity,
            {
                mobileNumber: { number: mobileNumber },
            },
            findOptions
        );
        return !!user;
    }

    async existByUsername(
        username: string,
        options?: IDatabaseFindOneOptions
    ): Promise<boolean> {
        const findOptions: any = {};
        if (options?.populate) findOptions.populate = options.populate;

        const em = options?.em || this.em;
        const user = await em.findOne(
            UserEntity,
            {
                username: { $ilike: username },
            },
            findOptions
        );
        return !!user;
    }

    // Continue with create, update, delete methods...
    async create(
        { email, country, role, avatar, ...others }: UserCreateRequestDto,
        { passwordExpired, passwordHash, salt, passwordCreated }: IAuthPassword,
        signUpFrom?: ENUM_USER_SIGN_UP_FROM,
        options?: IDatabaseCreateOptions
    ): Promise<UserEntity> {
        const em = options?.em || this.em;
        const normalizedEmail = email ? email.toLowerCase() : undefined;

        const user = this.userRepository.create(
            {
                email: normalizedEmail,
                password: passwordHash,
                role: em.getReference(RoleEntity, role),
                country: country
                    ? em.getReference(CountryEntity, country)
                    : undefined,
                passwordExpired,
                passwordCreated,
                signUpDate: this.helperDateService.create(),
                passwordAttempt: 0,
                signUpFrom: signUpFrom ?? ENUM_USER_SIGN_UP_FROM.PUBLIC,
                status: ENUM_USER_STATUS.ACTIVE,
                salt,
                avatar:
                    avatar ??
                    this.helperAvatarService.generateUserAvatar(
                        normalizedEmail ?? this.helperStringService.random(16)
                    ),
                ...others,
            },
            options
        );

        return user;
    }

    async createFromAuth(
        { email, country, avatar, ...others }: AuthSignUpRequestDto,
        { passwordExpired, passwordHash, salt, passwordCreated }: IAuthPassword,
        signUpFrom?: ENUM_USER_SIGN_UP_FROM,
        role?: string,
        options?: IDatabaseCreateOptions
    ): Promise<UserEntity> {
        const em = options?.em || this.em;
        const normalizedEmail = email.toLowerCase();

        const user = this.userRepository.create(
            {
                email: normalizedEmail,
                role: em.getReference(RoleEntity, role),
                country: em.getReference(CountryEntity, country),
                password: passwordHash,
                passwordExpired,
                passwordCreated,
                signUpDate: this.helperDateService.create(),
                passwordAttempt: 0,
                signUpFrom: signUpFrom ?? ENUM_USER_SIGN_UP_FROM.PUBLIC,
                status: ENUM_USER_STATUS.ACTIVE,
                salt,
                avatar:
                    avatar ??
                    this.helperAvatarService.generateUserAvatar(
                        normalizedEmail
                    ),
                ...others,
            },
            options
        );

        return user;
    }

    async signUp(
        role: string,
        {
            email,
            country,
            password: _rawPassword,
            avatar,
            ...others
        }: AuthSignUpRequestDto,
        { passwordExpired, passwordHash, salt, passwordCreated }: IAuthPassword,
        options?: IDatabaseCreateOptions
    ): Promise<UserEntity> {
        const em = options?.em || this.em;
        const normalizedEmail = email.toLowerCase();

        const user = em.create(UserEntity, {
            email: normalizedEmail,
            role: em.getReference(RoleEntity, role),
            country: country
                ? em.getReference(CountryEntity, country)
                : undefined,
            password: passwordHash,
            passwordExpired,
            passwordCreated,
            signUpDate: this.helperDateService.create(),
            passwordAttempt: 0,
            signUpFrom: ENUM_USER_SIGN_UP_FROM.PUBLIC,
            status: ENUM_USER_STATUS.ACTIVE,
            salt,
            avatar:
                avatar ??
                this.helperAvatarService.generateUserAvatar(normalizedEmail),
            ...others,
        });

        await em.persistAndFlush(user);
        return user;
    }

    async updatePassword(
        user: UserEntity,
        { passwordHash, passwordExpired, salt, passwordCreated }: IAuthPassword,
        options?: IDatabaseUpdateOptions
    ): Promise<UserEntity> {
        const em = options?.em || this.em;
        user.password = passwordHash;
        user.passwordExpired = passwordExpired;
        user.passwordCreated = passwordCreated;
        user.passwordAttempt = 0;
        user.salt = salt;

        await em.persistAndFlush(user);
        return user;
    }

    async increasePasswordAttempt(
        user: UserEntity,
        options?: IDatabaseUpdateOptions
    ): Promise<UserEntity> {
        const em = options?.em || this.em;
        user.passwordAttempt = ++user.passwordAttempt;
        await em.persistAndFlush(user);
        return user;
    }

    async resetPasswordAttempt(
        user: UserEntity,
        options?: IDatabaseUpdateOptions
    ): Promise<UserEntity> {
        const em = options?.em || this.em;
        user.passwordAttempt = 0;
        await em.persistAndFlush(user);
        return user;
    }

    async updatePasswordAttempt(
        user: UserEntity,
        { passwordAttempt }: UserUpdatePasswordAttemptRequestDto,
        options?: IDatabaseUpdateOptions
    ): Promise<UserEntity> {
        user.passwordAttempt = passwordAttempt;
        await (options?.em || this.em).persistAndFlush(user);
        return user;
    }

    async active(user: UserEntity): Promise<UserEntity> {
        user.status = ENUM_USER_STATUS.ACTIVE;
        await this.em.persistAndFlush(user);
        return user;
    }

    async inactive(user: UserEntity): Promise<UserEntity> {
        user.status = ENUM_USER_STATUS.INACTIVE;
        await this.em.persistAndFlush(user);
        return user;
    }

    async blocked(user: UserEntity): Promise<UserEntity> {
        user.status = ENUM_USER_STATUS.BLOCKED;
        await this.em.persistAndFlush(user);
        return user;
    }

    async update(
        user: UserEntity,
        { name }: UserUpdateRequestDto
    ): Promise<UserEntity> {
        user.name = name;
        await this.em.persistAndFlush(user);
        return user;
    }

    async updateProfile(
        user: UserEntity,
        data: UserUpdateProfileRequestDto,
        options?: IDatabaseUpdateOptions
    ): Promise<UserEntity> {
        const em = options?.em || this.em;
        Object.assign(user, data);
        await em.persistAndFlush(user);
        return user;
    }

    async updatePhoto(
        user: UserEntity,
        aws: AwsS3Dto,
        options?: IDatabaseUpdateOptions
    ): Promise<UserEntity> {
        user.photo = aws;
        const em = options?.em || this.em;
        await em.persistAndFlush(user);
        return user;
    }

    async updateMobileNumber(
        user: UserEntity,
        data: UserUpdateMobileNumberRequestDto
    ): Promise<UserEntity> {
        Object.assign(user, data);
        await this.em.persistAndFlush(user);
        return user;
    }

    async updateStatus(
        user: UserEntity,
        { status }: UserUpdateStatusRequestDto
    ): Promise<UserEntity> {
        user.status = status;
        await this.em.persistAndFlush(user);
        return user;
    }

    async delete(user: UserEntity): Promise<UserEntity> {
        await this.em.removeAndFlush(user);
        return user;
    }

    async deleteManyByIds(ids: string[]): Promise<boolean> {
        await this.em.nativeDelete(UserEntity, { id: { $in: ids } });
        return true;
    }

    // Helper/mapping methods
    mapGet(user: UserEntity): UserGetResponseDto {
        return plainToInstance(UserGetResponseDto, user);
    }

    mapProfile(user: UserEntity): UserProfileResponseDto {
        return plainToInstance(UserProfileResponseDto, user);
    }

    mapList(users: UserEntity[]): UserListResponseDto[] {
        return plainToInstance(UserListResponseDto, users);
    }

    mapShort(user: UserEntity): UserShortResponseDto {
        return plainToInstance(UserShortResponseDto, user);
    }

    mapShorts(users: UserEntity[]): UserShortResponseDto[] {
        return plainToInstance(UserShortResponseDto, users);
    }

    mapCensor(user: UserEntity): UserCensorResponseDto {
        return plainToInstance(UserCensorResponseDto, user);
    }

    mapCensors(users: UserEntity[]): UserCensorResponseDto[] {
        return plainToInstance(UserCensorResponseDto, users);
    }

    generateUsername(): string {
        const random = this.helperStringService.random(10);
        return `${this.usernamePrefix}${random}`;
    }

    checkPasswordExpired(passwordExpired: Date): boolean {
        const today = this.helperDateService.create();
        const passwordExpiredConvert =
            this.helperDateService.create(passwordExpired);

        return today > passwordExpiredConvert;
    }

    async join(user: UserEntity): Promise<UserEntity> {
        return this.em.populate(user, ['role', 'country']);
    }

    async findOneWithRoleAndCountryById(
        id: string
    ): Promise<UserEntity | null> {
        const user = await this.userRepository.findOneById(id);
        if (!user) {
            return null;
        }
        return this.join(user);
    }

    async deleteMany(
        find: FilterQuery<InferEntity<UserEntity>> = {},
        options?: IDatabaseDeleteOptions
    ): Promise<void> {
        await this.userRepository.deleteMany(find, options);
    }
    async softDelete(
        find: FilterQuery<InferEntity<UserEntity>> = {},
        options?: IDatabaseDeleteOptions
    ): Promise<void> {
        await this.userRepository.softDelete(find, options);
    }
    createRandomFilenamePhoto(
        userId: string,
        options: { mime: ENUM_FILE_MIME_IMAGE; size: number }
    ): string {
        const extension = EXTENSION_BY_MIME_IMAGE[options.mime] ?? 'jpg';
        return `user/${userId}/${randomUUID()}.${extension}`;
    }
    async findOneActiveById(
        id: string,
        options?: IDatabaseFindOneOptions
    ): Promise<UserEntity | null> {
        const user = await this.findOneById(id, {
            ...options,
            populate: ['role', 'country'],
            em: options?.em,
        });
        if (user && user.status === ENUM_USER_STATUS.ACTIVE) {
            return user;
        }
        return null;
    }
    async findOneActiveByEmail(
        email: string,
        options?: IDatabaseFindOneOptions
    ): Promise<UserEntity | null> {
        const user = await this.findOneByEmail(email, {
            ...options,
            populate: ['role', 'country'],
            em: options?.em,
        });
        if (user && user.status === ENUM_USER_STATUS.ACTIVE) {
            return user;
        }
        return null;
    }
    async findOneActiveByUsername(
        username: string,
        options?: IDatabaseFindOneOptions
    ): Promise<UserEntity | null> {
        const user = await this.findOneByUsername(username, {
            ...options,
            populate: ['role', 'country'],
            em: options?.em,
        });
        if (user && user.status === ENUM_USER_STATUS.ACTIVE) {
            return user;
        }
        return null;
    }

    checkMobileNumber(mobileNumber: string, country: CountryEntity): boolean {
        const phonePattern = new RegExp(country.phonePattern, 'g');
        return phonePattern.test(mobileNumber);
    }

    checkUsernamePattern(username: string): boolean {
        return !this.usernamePattern.test(username);
    }

    async checkUsernameBadWord(username: string): Promise<boolean> {
        // Implement your bad word checking logic here
        // For example, you can maintain a list of bad words and check against it
        // For now, returning false to indicate no bad word found
        return false;
    }

    async updateClaimUsername(
        user: UserEntity,
        { username }: UserUpdateClaimUsernameRequestDto,
        options?: IDatabaseUpdateOptions
    ): Promise<UserEntity> {
        user.username = username;
        user.updatedAt = new Date();

        const em = options?.em ?? this.em;
        await em.persistAndFlush(user);

        return user;
    }

    async updateVerificationEmail(
        user: UserEntity,
        options?: IDatabaseUpdateOptions
    ): Promise<UserEntity> {
        user.verification.email = true;
        user.verification.emailVerifiedDate = new Date();
        user.updatedAt = new Date();

        const em = options?.em ?? this.em;
        await em.persistAndFlush(user);

        return user;
    }

    async updateVerificationMobileNumber(
        user: UserEntity,
        options?: IDatabaseUpdateOptions
    ): Promise<UserEntity> {
        user.verification.mobileNumber = true;
        user.verification.mobileNumberVerifiedDate = new Date();
        user.updatedAt = new Date();

        const em = options?.em ?? this.em;
        await em.persistAndFlush(user);

        return user;
    }

    async existByRole(roleId: string): Promise<boolean> {
        const count = await this.em.count(UserEntity, {
            role: { id: roleId },
        });
        return count > 0;
    }
}
