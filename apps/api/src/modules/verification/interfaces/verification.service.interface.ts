import {
    IDatabaseCreateOptions,
    IDatabaseFindAllOptions,
    IDatabaseFindOneOptions,
    IDatabaseGetTotalOptions,
    IDatabaseSaveOptions,
    IDatabaseUpdateManyOptions,
} from 'src/common/database/interfaces/database.interface';
import { UserEntity } from 'src/modules/user/repository/entities/user.entity';
import { VerificationResponse } from 'src/modules/verification/dtos/response/verification.response';
import { VerificationEntity } from 'src/modules/verification/repository/entity/verification.entity';

export interface IVerificationService {
    findAll(
        find?: Record<string, any>,
        options?: IDatabaseFindAllOptions
    ): Promise<VerificationEntity[]>;
    findOneById(
        _id: string,
        options?: IDatabaseFindOneOptions
    ): Promise<VerificationEntity>;
    findOne(
        find: Record<string, any>,
        options?: IDatabaseFindOneOptions
    ): Promise<VerificationEntity>;
    getTotal(
        find?: Record<string, any>,
        options?: IDatabaseGetTotalOptions
    ): Promise<number>;
    createEmailByUser(
        user: UserEntity,
        options?: IDatabaseCreateOptions
    ): Promise<VerificationEntity>;
    createMobileNumberByUser(
        user: UserEntity,
        options?: IDatabaseCreateOptions
    ): Promise<VerificationEntity>;
    findOneLatestEmailByUser(
        user: string,
        options?: IDatabaseFindOneOptions
    ): Promise<VerificationEntity>;
    findOneLatestMobileNumberByUser(
        user: string,
        options?: IDatabaseFindOneOptions
    ): Promise<VerificationEntity>;
    findOneActiveLatestEmailByUser(
        user: string,
        email: string,
        options?: IDatabaseFindOneOptions
    ): Promise<VerificationEntity>;
    validateOtp(verification: VerificationEntity, otp: string): boolean;
    verify(
        repository: VerificationEntity,
        options?: IDatabaseSaveOptions
    ): Promise<VerificationEntity>;
    incrementOtpAttempt(
        repository: VerificationEntity,
        options?: IDatabaseSaveOptions
    ): Promise<VerificationEntity>;
    inactiveEmailManyByUser(
        user: string,
        options?: IDatabaseUpdateManyOptions
    ): Promise<void>;
    inactiveMobileNumberManyByUser(
        user: string,
        options?: IDatabaseUpdateManyOptions
    ): Promise<void>;
    createOtp(): string;
    createExpiredDate(): Date;
    createReference(): string;
    map(verification: VerificationEntity): VerificationResponse;
    deleteMany(
        find?: Record<string, any>,
        options?: IDatabaseUpdateManyOptions
    ): Promise<void>;
}
