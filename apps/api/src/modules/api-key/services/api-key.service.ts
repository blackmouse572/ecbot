import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { plainToInstance } from 'class-transformer';
import {
    IDatabaseCreateOptions,
    IDatabaseDeleteManyOptions,
    IDatabaseFindAllOptions,
    IDatabaseFindOneOptions,
    IDatabaseGetTotalOptions,
    IDatabaseSaveOptions,
    IDatabaseUpdateManyOptions,
} from 'src/common/database/interfaces/database.interface';
import { ENUM_HELPER_DATE_DAY_OF } from 'src/common/helper/enums/helper.enum';
import { HelperDateService } from 'src/common/helper/services/helper.date.service';
import { HelperHashService } from 'src/common/helper/services/helper.hash.service';
import { HelperStringService } from 'src/common/helper/services/helper.string.service';
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
import { IApiKeyService } from 'src/modules/api-key/interfaces/api-key.service.interface';
import { ApiKeyEntity } from 'src/modules/api-key/repository/entities/api-key.entity';
import { ApiKeyRepository } from 'src/modules/api-key/repository/repositories/api-key.repository';

@Injectable()
export class ApiKeyService implements IApiKeyService {
    private readonly env: string;

    constructor(
        private readonly helperStringService: HelperStringService,
        private readonly configService: ConfigService,
        private readonly helperHashService: HelperHashService,
        private readonly helperDateService: HelperDateService,
        private readonly apiKeyRepository: ApiKeyRepository
    ) {
        this.env = this.configService.get<string>('app.env');
    }

    async findAll(
        find?: Record<string, any>,
        options?: IDatabaseFindAllOptions
    ): Promise<ApiKeyEntity[]> {
        return this.apiKeyRepository.find(find, options);
    }

    async findOneById(
        _id: string,
        options?: IDatabaseFindOneOptions
    ): Promise<ApiKeyEntity> {
        return this.apiKeyRepository.findOneById(_id, options);
    }

    async findOne(
        find: Record<string, any>,
        options?: IDatabaseFindOneOptions
    ): Promise<ApiKeyEntity> {
        return this.apiKeyRepository.findOne(find, options);
    }

    async findOneByKey(
        key: string,
        options?: IDatabaseFindOneOptions
    ): Promise<ApiKeyEntity> {
        return this.apiKeyRepository.findOne<ApiKeyEntity>({ key }, options);
    }

    async findOneByActiveKey(
        key: string,
        options?: IDatabaseFindOneOptions
    ): Promise<ApiKeyEntity> {
        return this.apiKeyRepository.findOne<ApiKeyEntity>(
            {
                key,
                isActive: true,
            },
            options
        );
    }

    async getTotal(
        find?: Record<string, any>,
        options?: IDatabaseGetTotalOptions
    ): Promise<number> {
        return this.apiKeyRepository.getTotal(find, options);
    }

    async create(
        { name, type, startDate, endDate }: ApiKeyCreateRequestDto,
        options?: IDatabaseCreateOptions
    ): Promise<ApiKeyCreateResponseDto> {
        const key = await this.createKey();
        const secret = await this.createSecret();
        const hash: string = await this.createHashApiKey(key, secret);

        const data: ApiKeyEntity = new ApiKeyEntity();
        data.name = name;
        data.key = key;
        data.hash = hash;
        data.isActive = true;
        data.type = type;

        if (startDate && endDate) {
            data.startDate = this.helperDateService.create(startDate, {
                dayOf: ENUM_HELPER_DATE_DAY_OF.START,
            });
            data.endDate = this.helperDateService.create(endDate, {
                dayOf: ENUM_HELPER_DATE_DAY_OF.END,
            });
        }

        const created: ApiKeyEntity =
            await this.apiKeyRepository.create<ApiKeyEntity>(data, options);

        return { id: created.id, key: created.key, secret };
    }

    async createRaw(
        {
            name,
            key,
            type,
            secret,
            startDate,
            endDate,
        }: ApiKeyCreateRawRequestDto,
        options?: IDatabaseCreateOptions
    ): Promise<ApiKeyCreateResponseDto> {
        const hash: string = await this.createHashApiKey(key, secret);

        const data: ApiKeyEntity = new ApiKeyEntity();
        data.name = name;
        data.key = key;
        data.hash = hash;
        data.isActive = true;
        data.type = type;

        if (startDate && endDate) {
            data.startDate = this.helperDateService.create(startDate, {
                dayOf: ENUM_HELPER_DATE_DAY_OF.START,
            });
            data.endDate = this.helperDateService.create(endDate, {
                dayOf: ENUM_HELPER_DATE_DAY_OF.END,
            });
        }

        const created: ApiKeyEntity =
            await this.apiKeyRepository.create<ApiKeyEntity>(data, options);

        return { id: created.id, key: created.key, secret };
    }

    async active(
        repository: ApiKeyEntity,
        options?: IDatabaseSaveOptions
    ): Promise<ApiKeyEntity> {
        repository.isActive = true;

        return this.apiKeyRepository.save(repository, options);
    }

    async inactive(
        repository: ApiKeyEntity,
        options?: IDatabaseSaveOptions
    ): Promise<ApiKeyEntity> {
        repository.isActive = false;

        return this.apiKeyRepository.save(repository, options);
    }

    async update(
        repository: ApiKeyEntity,
        { name }: ApiKeyUpdateRequestDto,
        options?: IDatabaseSaveOptions
    ): Promise<ApiKeyEntity> {
        repository.name = name;

        return this.apiKeyRepository.save(repository, options);
    }

    async updateDate(
        repository: ApiKeyEntity,
        { startDate, endDate }: ApiKeyUpdateDateRequestDto,
        options?: IDatabaseSaveOptions
    ): Promise<ApiKeyEntity> {
        repository.startDate = this.helperDateService.create(startDate, {
            dayOf: ENUM_HELPER_DATE_DAY_OF.START,
        });
        repository.endDate = this.helperDateService.create(endDate, {
            dayOf: ENUM_HELPER_DATE_DAY_OF.END,
        });

        return this.apiKeyRepository.save(repository, options);
    }

    async reset(
        repository: ApiKeyEntity,
        options?: IDatabaseSaveOptions
    ): Promise<ApiKeyResetResponseDto> {
        const secret: string = await this.createSecret();
        const hash: string = await this.createHashApiKey(
            repository.key,
            secret
        );

        repository.hash = hash;

        const updated = await this.apiKeyRepository.save(repository, options);

        return { id: updated.id, key: updated.key, secret };
    }

    async delete(
        repository: ApiKeyEntity,
        options?: IDatabaseSaveOptions
    ): Promise<ApiKeyEntity> {
        return this.apiKeyRepository.softDelete(repository, options);
    }

    async validateHashApiKey(
        hashFromRequest: string,
        hash: string
    ): Promise<boolean> {
        return this.helperHashService.sha256Compare(hashFromRequest, hash);
    }

    async createKey(): Promise<string> {
        const random: string = this.helperStringService.random(25);
        return `${this.env}_${random}`;
    }

    async createSecret(): Promise<string> {
        return this.helperStringService.random(35);
    }

    async createHashApiKey(key: string, secret: string): Promise<string> {
        return this.helperHashService.sha256(`${key}:${secret}`);
    }

    async deleteMany(
        find?: Record<string, any>,
        options?: IDatabaseDeleteManyOptions
    ): Promise<boolean> {
        await this.apiKeyRepository.deleteMany(find, options);

        return true;
    }

    async deleteAll() {
        await this.apiKeyRepository.deleteAll();

        return true;
    }

    async inactiveManyByEndDate(
        options?: IDatabaseUpdateManyOptions
    ): Promise<boolean> {
        const today = this.helperDateService.create();
        await this.apiKeyRepository.updateMany(
            {
                endDate: {
                    $lte: today,
                },
                isActive: true,
            },
            {
                isActive: false,
            },
            options
        );

        return true;
    }

    mapList(apiKeys: ApiKeyEntity[] | ApiKeyEntity[]): ApiKeyListResponseDto[] {
        return plainToInstance(ApiKeyListResponseDto, apiKeys);
    }

    mapGet(apiKey: ApiKeyEntity | ApiKeyEntity): ApiKeyGetResponseDto {
        return plainToInstance(ApiKeyGetResponseDto, apiKey);
    }
}
