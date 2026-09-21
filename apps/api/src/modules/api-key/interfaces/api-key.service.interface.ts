import {
    IDatabaseCreateOptions,
    IDatabaseDeleteManyOptions,
    IDatabaseFindAllOptions,
    IDatabaseGetTotalOptions,
    IDatabaseOptions,
    IDatabaseSaveOptions,
    IDatabaseUpdateManyOptions,
} from 'src/common/database/interfaces/database.interface';
import {
    ApiKeyCreateRawRequestDto,
    ApiKeyCreateRequestDto,
} from 'src/modules/api-key/dtos/request/api-key.create.request.dto';
import { ApiKeyUpdateDateRequestDto } from 'src/modules/api-key/dtos/request/api-key.update-date.request.dto';
import { ApiKeyUpdateRequestDto } from 'src/modules/api-key/dtos/request/api-key.update.request.dto';
import { ApiKeyCreateResponseDto } from 'src/modules/api-key/dtos/response/api-key.create.dto';
import { ApiKeyGetResponseDto } from 'src/modules/api-key/dtos/response/api-key.get.response.dto';
import { ApiKeyListResponseDto } from 'src/modules/api-key/dtos/response/api-key.list.response.dto';
import { ApiKeyResetResponseDto } from 'src/modules/api-key/dtos/response/api-key.reset.dto';
import { ApiKeyEntity } from 'src/modules/api-key/repository/entities/api-key.entity';

export interface IApiKeyService {
    findAll(
        find?: Record<string, any>,
        options?: IDatabaseFindAllOptions
    ): Promise<ApiKeyEntity[]>;
    findOneById(_id: string, options?: IDatabaseOptions): Promise<ApiKeyEntity>;
    findOne(
        find: Record<string, any>,
        options?: IDatabaseOptions
    ): Promise<ApiKeyEntity>;
    findOneByKey(
        key: string,
        options?: IDatabaseOptions
    ): Promise<ApiKeyEntity>;
    findOneByActiveKey(
        key: string,
        options?: IDatabaseOptions
    ): Promise<ApiKeyEntity>;
    getTotal(
        find?: Record<string, any>,
        options?: IDatabaseGetTotalOptions
    ): Promise<number>;
    create(
        { name, type, startDate, endDate }: ApiKeyCreateRequestDto,
        options?: IDatabaseCreateOptions
    ): Promise<ApiKeyCreateResponseDto>;
    createRaw(
        {
            name,
            key,
            type,
            secret,
            startDate,
            endDate,
        }: ApiKeyCreateRawRequestDto,
        options?: IDatabaseCreateOptions
    ): Promise<ApiKeyCreateResponseDto>;
    active(
        repository: ApiKeyEntity,
        options?: IDatabaseSaveOptions
    ): Promise<ApiKeyEntity>;
    inactive(
        repository: ApiKeyEntity,
        options?: IDatabaseSaveOptions
    ): Promise<ApiKeyEntity>;
    update(
        repository: ApiKeyEntity,
        { name }: ApiKeyUpdateRequestDto,
        options?: IDatabaseSaveOptions
    ): Promise<ApiKeyEntity>;
    updateDate(
        repository: ApiKeyEntity,
        { startDate, endDate }: ApiKeyUpdateDateRequestDto,
        options?: IDatabaseSaveOptions
    ): Promise<ApiKeyEntity>;
    reset(
        repository: ApiKeyEntity,
        options?: IDatabaseSaveOptions
    ): Promise<ApiKeyResetResponseDto>;
    delete(
        repository: ApiKeyEntity,
        options?: IDatabaseSaveOptions
    ): Promise<ApiKeyEntity>;
    validateHashApiKey(hashFromRequest: string, hash: string): Promise<boolean>;
    createKey(): Promise<string>;
    createSecret(): Promise<string>;
    createHashApiKey(key: string, secret: string): Promise<string>;
    deleteMany(
        find?: Record<string, any>,
        options?: IDatabaseDeleteManyOptions
    ): Promise<boolean>;
    inactiveManyByEndDate(
        options?: IDatabaseUpdateManyOptions
    ): Promise<boolean>;
    mapList(apiKeys: ApiKeyEntity[] | ApiKeyEntity[]): ApiKeyListResponseDto[];
    mapGet(apiKey: ApiKeyEntity | ApiKeyEntity): ApiKeyGetResponseDto;
}
