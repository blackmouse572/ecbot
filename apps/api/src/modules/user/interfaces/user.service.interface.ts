import { CountryEntity } from '@app/modules/country/repository/entities/country.entity';
import { UserEntity } from '@app/modules/user/repository/entities/user.entity';
import {
    IDatabaseAggregateOptions,
    IDatabaseCreateOptions,
    IDatabaseDeleteManyOptions,
    IDatabaseExistsOptions,
    IDatabaseFindAllAggregateOptions,
    IDatabaseFindAllOptions,
    IDatabaseFindOneOptions,
    IDatabaseGetTotalOptions,
    IDatabaseOptions,
    IDatabaseSaveOptions,
    IDatabaseUpdateOptions,
} from 'src/common/database/interfaces/database.interface';
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
import { UserUploadPhotoRequestDto } from 'src/modules/user/dtos/request/user.upload-photo.request.dto';
import { UserCensorResponseDto } from 'src/modules/user/dtos/response/user.censor.response.dto';
import { UserGetResponseDto } from 'src/modules/user/dtos/response/user.get.response.dto';
import { UserListResponseDto } from 'src/modules/user/dtos/response/user.list.response.dto';
import { UserProfileResponseDto } from 'src/modules/user/dtos/response/user.profile.response.dto';
import { UserShortResponseDto } from 'src/modules/user/dtos/response/user.short.response.dto';
import { ENUM_USER_SIGN_UP_FROM } from 'src/modules/user/enums/user.enum';
import { IUserEntity } from 'src/modules/user/interfaces/user.interface';

export interface IUserService {
    findAll(
        find?: Record<string, any>,
        options?: IDatabaseFindAllOptions
    ): Promise<UserEntity[]>;
    getTotal(
        find?: Record<string, any>,
        options?: IDatabaseGetTotalOptions
    ): Promise<number>;
    findAllWithRoleAndCountry(
        find?: Record<string, any>,
        options?: IDatabaseFindAllAggregateOptions
    ): Promise<IUserEntity[]>;
    getTotalWithRoleAndCountry(
        find?: Record<string, any>,
        options?: IDatabaseAggregateOptions
    ): Promise<number>;
    findOneById(_id: string, options?: IDatabaseOptions): Promise<UserEntity>;
    findOne(
        find: Record<string, any>,
        options?: IDatabaseOptions
    ): Promise<UserEntity>;
    findOneByEmail(
        email: string,
        options?: IDatabaseFindOneOptions
    ): Promise<UserEntity>;
    findOneByUsername(
        username: string,
        options?: IDatabaseFindOneOptions
    ): Promise<UserEntity>;
    findOneByMobileNumberAndCountry(
        country: string,
        mobileNumber: string,
        options?: IDatabaseFindOneOptions
    ): Promise<UserEntity>;
    findOneByMobileNumber(
        mobileNumber: string,
        options?: IDatabaseFindOneOptions
    ): Promise<UserEntity>;

    findOneWithRoleAndCountry(
        find?: Record<string, any>,
        options?: IDatabaseFindAllOptions
    ): Promise<UserEntity>;
    findOneWithRoleAndCountryById(
        _id: string,
        options?: IDatabaseFindAllOptions
    ): Promise<UserEntity>;
    findAllActiveWithRoleAndCountry(
        find?: Record<string, any>,
        options?: IDatabaseFindAllOptions
    ): Promise<UserEntity[]>;
    getTotalActive(
        find?: Record<string, any>,
        options?: IDatabaseGetTotalOptions
    ): Promise<number>;
    findOneActiveById(
        _id: string,
        options?: IDatabaseOptions
    ): Promise<UserEntity>;
    findOneActiveByEmail(
        email: string,
        options?: IDatabaseOptions
    ): Promise<UserEntity>;
    findOneActiveByMobileNumber(
        country: string,
        mobileNumber: string,
        options?: IDatabaseOptions
    ): Promise<UserEntity>;
    create(
        { email, name, role, country }: UserCreateRequestDto,
        { passwordExpired, passwordHash, salt, passwordCreated }: IAuthPassword,
        signUpFrom: ENUM_USER_SIGN_UP_FROM,
        options?: IDatabaseCreateOptions
    ): Promise<UserEntity>;
    signUp(
        role: string,
        { email, name, country }: AuthSignUpRequestDto,
        { passwordExpired, passwordHash, salt, passwordCreated }: IAuthPassword,
        options?: IDatabaseCreateOptions
    ): Promise<UserEntity>;
    existByRole(
        role: string,
        options?: IDatabaseExistsOptions
    ): Promise<boolean>;
    existByEmail(
        email: string,
        options?: IDatabaseExistsOptions
    ): Promise<boolean>;
    existByUsername(
        username: string,
        options?: IDatabaseExistsOptions
    ): Promise<boolean>;
    updatePhoto(
        repository: UserEntity,
        photo: AwsS3Dto,
        options?: IDatabaseSaveOptions
    ): Promise<UserEntity>;
    updatePassword(
        repository: UserEntity,
        { passwordHash, passwordExpired, salt, passwordCreated }: IAuthPassword,
        options?: IDatabaseSaveOptions
    ): Promise<UserEntity>;
    updateStatus(
        repository: UserEntity,
        { status }: UserUpdateStatusRequestDto,
        options?: IDatabaseSaveOptions
    ): Promise<UserEntity>;
    updatePasswordAttempt(
        repository: UserEntity,
        { passwordAttempt }: UserUpdatePasswordAttemptRequestDto,
        options?: IDatabaseSaveOptions
    ): Promise<UserEntity>;
    increasePasswordAttempt(
        repository: UserEntity,
        options?: IDatabaseUpdateOptions
    ): Promise<UserEntity>;
    resetPasswordAttempt(
        repository: UserEntity,
        options?: IDatabaseSaveOptions
    ): Promise<UserEntity>;
    updatePasswordExpired(
        repository: UserEntity,
        passwordExpired: Date,
        options?: IDatabaseSaveOptions
    ): Promise<UserEntity>;
    update(
        repository: UserEntity,
        { country, name, role }: UserUpdateRequestDto,
        options?: IDatabaseSaveOptions
    ): Promise<UserEntity>;
    updateMobileNumber(
        repository: UserEntity,
        { country, number }: UserUpdateMobileNumberRequestDto,
        options?: IDatabaseSaveOptions
    ): Promise<UserEntity>;
    updateClaimUsername(
        repository: UserEntity,
        { username }: UserUpdateClaimUsernameRequestDto,
        options?: IDatabaseSaveOptions
    ): Promise<UserEntity>;
    removeMobileNumber(
        repository: UserEntity,
        options?: IDatabaseSaveOptions
    ): Promise<UserEntity>;
    softDelete(
        repository: UserEntity,
        options?: IDatabaseSaveOptions
    ): Promise<UserEntity>;
    deleteMany(
        find?: Record<string, any>,
        options?: IDatabaseDeleteManyOptions
    ): Promise<boolean>;
    updateProfile(
        repository: UserEntity,
        { country, name, gender }: UserUpdateProfileRequestDto,
        options?: IDatabaseSaveOptions
    ): Promise<UserEntity>;
    updateVerificationEmail(
        repository: UserEntity,
        options?: IDatabaseSaveOptions
    ): Promise<UserEntity>;
    updateVerificationMobileNumber(
        repository: UserEntity,
        options?: IDatabaseSaveOptions
    ): Promise<UserEntity>;
    join(repository: UserEntity): Promise<UserEntity>;
    createRandomFilenamePhoto(
        user: string,
        { mime }: UserUploadPhotoRequestDto
    ): string;
    createRandomUsername(): string;
    checkUsernamePattern(username: string): boolean;
    checkUsernameBadWord(username: string): Promise<boolean>;
    mapProfile(user: UserEntity | IUserEntity): UserProfileResponseDto;
    mapList(users: UserEntity[] | IUserEntity[]): UserListResponseDto[];
    mapCensor(user: UserEntity | UserEntity): UserCensorResponseDto;
    mapShort(users: UserEntity[] | IUserEntity[]): UserShortResponseDto[];
    mapGet(user: UserEntity | IUserEntity): UserGetResponseDto;
    checkMobileNumber(mobileNumber: string, country: CountryEntity): boolean;
}
