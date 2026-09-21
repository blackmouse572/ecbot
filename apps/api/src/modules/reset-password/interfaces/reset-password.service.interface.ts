import {
    IDatabaseCreateManyOptions,
    IDatabaseCreateOptions,
    IDatabaseDeleteManyOptions,
    IDatabaseFindAllOptions,
    IDatabaseFindOneOptions,
    IDatabaseGetTotalOptions,
    IDatabaseSaveOptions,
    IDatabaseUpdateManyOptions,
} from 'src/common/database/interfaces/database.interface';
import { ResetPasswordCreateRequestDto } from 'src/modules/reset-password/dtos/request/reset-password.create.request.dto';
import { IResetPasswordRequest } from 'src/modules/reset-password/interfaces/reset-password.interface';
import { ResetPasswordEntity } from 'src/modules/reset-password/repository/entities/reset-password.entity';

export interface IResetPasswordService {
    findAll(
        find?: Record<string, any>,
        options?: IDatabaseFindAllOptions
    ): Promise<ResetPasswordEntity[]>;
    findOneById(
        _id: string,
        options?: IDatabaseFindOneOptions
    ): Promise<ResetPasswordEntity>;
    findOne(
        find: Record<string, any>,
        options?: IDatabaseFindOneOptions
    ): Promise<ResetPasswordEntity>;
    findOneByToken(
        token: string,
        options?: IDatabaseFindOneOptions
    ): Promise<ResetPasswordEntity>;
    checkActiveLatestEmailByUser(
        user: string,
        options?: IDatabaseFindOneOptions
    ): Promise<IResetPasswordRequest>;
    getTotal(
        find?: Record<string, any>,
        options?: IDatabaseGetTotalOptions
    ): Promise<number>;
    createEmailByUser(
        user: string,
        email: string,
        options?: IDatabaseCreateOptions
    ): Promise<ResetPasswordEntity>;
    requestEmailByUser(
        user: string,
        { email }: ResetPasswordCreateRequestDto,
        options?: IDatabaseCreateOptions
    ): Promise<IResetPasswordRequest>;
    delete(
        repository: ResetPasswordEntity,
        options?: IDatabaseSaveOptions
    ): Promise<ResetPasswordEntity>;
    reset(
        repository: ResetPasswordEntity,
        options?: IDatabaseSaveOptions
    ): Promise<ResetPasswordEntity>;
    verify(
        repository: ResetPasswordEntity,
        options?: IDatabaseSaveOptions
    ): Promise<ResetPasswordEntity>;
    inactive(
        repository: ResetPasswordEntity,
        options?: IDatabaseSaveOptions
    ): Promise<ResetPasswordEntity>;
    inactiveEmailManyByUser(
        user: string,
        options?: IDatabaseUpdateManyOptions
    ): Promise<any>;
    createMany(
        data: ResetPasswordEntity[],
        options?: IDatabaseCreateManyOptions
    ): Promise<any>;
    deleteMany(
        find?: Record<string, any>,
        options?: IDatabaseDeleteManyOptions
    ): Promise<any>;
    createOtp(): string;
    createExpired(): Date;
    createReference(): string;
    checkExpired(expired: Date): boolean;
    createToken(): string;
    checkToken(token1: string, token2: string): boolean;
    checkOtp(otp1: string, otp2: string): boolean;
}
