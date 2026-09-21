import { AccountCreateRequestDto } from '@app/modules/account/dtos/request/account.create.request.dto';
import { ENUM_ACCOUNT_TYPE } from '../enums/account.enum';
import { AccountUpdateStatusRequestDto } from '@app/modules/account/dtos/request/account.update-status.request.dto';
import { AccountUpdateRequestDto } from '@app/modules/account/dtos/request/account.update.request.dto';
import {
    IDatabaseCreateOptions,
    IDatabaseDeleteManyOptions,
    IDatabaseFindAllOptions,
    IDatabaseGetTotalOptions,
    IDatabaseOptions,
    IDatabaseSaveOptions,
} from 'src/common/database/interfaces/database.interface';
import { AccountEntity } from 'src/modules/account/repository/entities/account.entity';
import { AccountListResponseDto } from '../dtos/response/account.list.response.dto';
import {
    IAccountDoc,
    IAccountEntity,
    IAccountEntityWithPages,
} from './account.interface';

export interface IAccountService {
    findAll(
        find?: Record<string, any>,
        options?: IDatabaseFindAllOptions
    ): Promise<AccountEntity[]>;
    getTotal(
        find?: Record<string, any>,
        options?: IDatabaseGetTotalOptions
    ): Promise<number>;
    findOneByIdOrSlug(
        _id: string,
        options?: IDatabaseOptions,
        workspaceId?: string
    ): Promise<AccountEntity>;
    findOne(
        find: Record<string, any>,
        options?: IDatabaseOptions
    ): Promise<AccountEntity>;
    create(
        dto: AccountCreateRequestDto,
        options?: IDatabaseCreateOptions
    ): Promise<AccountEntity>;
    updateStatus(
        repository: AccountEntity,
        dto: AccountUpdateStatusRequestDto,
        options?: IDatabaseSaveOptions
    ): Promise<AccountEntity>;
    update(
        repository: AccountEntity,
        dto: AccountUpdateRequestDto,
        options?: IDatabaseSaveOptions
    ): Promise<AccountEntity>;
    softDelete(
        repository: AccountEntity,
        options?: IDatabaseSaveOptions
    ): Promise<AccountEntity>;
    findAccountsNotBelongingToAnyChatbot(
        workspaceId?: string,
        options?: IDatabaseFindAllOptions
    ): Promise<AccountEntity[]>;
    deleteMany(
        find?: Record<string, any>,
        options?: IDatabaseDeleteManyOptions
    ): Promise<boolean>;
    mapList(
        accounts: IAccountDoc[] | IAccountEntity[]
    ): AccountListResponseDto[];
    syncAccount(
        code: string,
        platform: ENUM_ACCOUNT_TYPE,
        workspaceId: string,
        userId: string,
        actionBy?: string
    ): Promise<IAccountEntityWithPages>;
}
