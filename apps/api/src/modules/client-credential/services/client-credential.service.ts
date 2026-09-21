import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { plainToInstance } from 'class-transformer';
import {
    IDatabaseCreateOptions,
    IDatabaseFindAllOptions,
    IDatabaseFindOneOptions,
    IDatabaseGetTotalOptions,
} from 'src/common/database/interfaces/database.interface';
import { ENUM_HELPER_DATE_DAY_OF } from 'src/common/helper/enums/helper.enum';
import { HelperDateService } from 'src/common/helper/services/helper.date.service';
import { HelperHashService } from 'src/common/helper/services/helper.hash.service';
import { HelperStringService } from 'src/common/helper/services/helper.string.service';
import { ClientCredentialCreateRequestDto } from 'src/modules/client-credential/dtos/request/client-credential.create.request.dto';
import { ClientCredentialCreateResponseDto } from 'src/modules/client-credential/dtos/response/client-credential.create.response.dto';
import { ClientCredentialGetResponseDto } from 'src/modules/client-credential/dtos/response/client-credential.get.response.dto';
import { ClientCredentialEntity } from 'src/modules/client-credential/repository/entities/client-credential.entity';
import { ClientCredentialRepository } from 'src/modules/client-credential/repository/repositories/client-credential.repository';
import { WorkspaceEntity } from 'src/modules/workspace/repository/entities/workspace.entity';

@Injectable()
export class ClientCredentialService {
    private readonly env: string;

    constructor(
        private readonly configService: ConfigService,
        private readonly helperStringService: HelperStringService,
        private readonly helperHashService: HelperHashService,
        private readonly helperDateService: HelperDateService,
        private readonly clientCredentialRepository: ClientCredentialRepository
    ) {
        this.env = this.configService.get<string>('app.env');
    }

    async findAll(
        find?: Record<string, any>,
        options?: IDatabaseFindAllOptions
    ): Promise<ClientCredentialEntity[]> {
        return this.clientCredentialRepository.find(find, options);
    }

    async getTotal(
        find?: Record<string, any>,
        options?: IDatabaseGetTotalOptions
    ): Promise<number> {
        return this.clientCredentialRepository.getTotal(find, options);
    }

    async findOneByActiveKey(
        key: string,
        options?: IDatabaseFindOneOptions
    ): Promise<ClientCredentialEntity> {
        return this.clientCredentialRepository.findOne<ClientCredentialEntity>(
            { key, isActive: true },
            options
        );
    }

    async create(
        workspace: WorkspaceEntity,
        { name, startDate, endDate }: ClientCredentialCreateRequestDto,
        createdBy?: string,
        options?: IDatabaseCreateOptions
    ): Promise<ClientCredentialCreateResponseDto> {
        const key = await this.createKey();
        const secret = await this.createSecret();
        const hash: string = await this.createHash(key, secret);

        const data = new ClientCredentialEntity();
        data.workspace = workspace;
        data.name = name;
        data.key = key;
        data.hash = hash;
        data.isActive = true;
        if (createdBy) {
            data.createdBy = createdBy;
        }

        if (startDate && endDate) {
            data.startDate = this.helperDateService.create(
                new Date(startDate),
                {
                    dayOf: ENUM_HELPER_DATE_DAY_OF.START,
                }
            );
            data.endDate = this.helperDateService.create(new Date(endDate), {
                dayOf: ENUM_HELPER_DATE_DAY_OF.END,
            });
        }

        const created =
            await this.clientCredentialRepository.create<ClientCredentialEntity>(
                data,
                options
            );

        return { id: created.id, key: created.key, secret };
    }

    /**
     * Mint a new secret for an existing credential. The public `key` is
     * unchanged, so a third party updates one value rather than re-registering;
     * the previous secret stops validating immediately. Like create, the
     * plaintext is returned once and only the hash is persisted (ADR-0012).
     */
    async rotate(
        credential: ClientCredentialEntity,
        actionBy?: string
    ): Promise<ClientCredentialCreateResponseDto> {
        const secret = await this.createSecret();
        credential.hash = await this.createHash(credential.key, secret);

        const updated = await this.clientCredentialRepository.save(credential, {
            actionBy,
        });

        return { id: updated.id, key: updated.key, secret };
    }

    async createKey(): Promise<string> {
        const random: string = this.helperStringService.random(25);
        return `${this.env}_${random}`;
    }

    async createSecret(): Promise<string> {
        return this.helperStringService.random(35);
    }

    async createHash(key: string, secret: string): Promise<string> {
        return this.helperHashService.sha256(`${key}:${secret}`);
    }

    async validateHash(
        hashFromRequest: string,
        hash: string
    ): Promise<boolean> {
        return this.helperHashService.sha256Compare(hashFromRequest, hash);
    }

    async findOne(
        find: Record<string, any>,
        options?: IDatabaseFindOneOptions
    ): Promise<ClientCredentialEntity | null> {
        return this.clientCredentialRepository.findOne(find, options);
    }

    async delete(
        credential: ClientCredentialEntity,
        actionBy?: string
    ): Promise<ClientCredentialEntity> {
        credential.isActive = false;
        credential.deletedAt = new Date();
        if (actionBy) {
            (credential as any).deletedBy = actionBy;
        }
        return this.clientCredentialRepository.save(credential, {
            actionBy,
        });
    }

    mapList(
        entities: ClientCredentialEntity[]
    ): ClientCredentialGetResponseDto[] {
        return plainToInstance(ClientCredentialGetResponseDto, entities);
    }
}
