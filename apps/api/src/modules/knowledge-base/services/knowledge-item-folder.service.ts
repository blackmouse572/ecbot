import {
    IDatabaseCreateOptions,
    IDatabaseDeleteOptions,
    IDatabaseFindAllOptions,
    IDatabaseGetTotalOptions,
    IDatabaseOptions,
    IDatabaseSoftDeleteOptions,
    IDatabaseUpdateOptions,
} from '@app/common/database/interfaces/database.interface';
import { EntityManager } from '@mikro-orm/postgresql';
import { Injectable } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { KnowledgeItemFolderEntity } from '../repository/entities/knowledge-item-folder.entity';
import { KnowledgeItemFolderRepository } from '../repository/repositories/knowledge-item-folder.repository';
import { KnowledgeBaseEntity } from '../repository/entities/knowledge-base.entity';
import { KnowledgeItemFolderResponseDto } from '../dtos/response/knowledge-item-folder.response.dto';

@Injectable()
export class KnowledgeItemFolderService {
    constructor(
        private readonly em: EntityManager,
        private readonly folderRepository: KnowledgeItemFolderRepository
    ) {}

    async find(
        find?: Record<string, any>,
        options?: IDatabaseFindAllOptions
    ): Promise<KnowledgeItemFolderEntity[]> {
        return this.folderRepository.find(find, options);
    }

    async findByKnowledgeBase(
        kbId: string
    ): Promise<KnowledgeItemFolderEntity[]> {
        return this.folderRepository.find({
            knowledgeBase: kbId,
            deletedAt: null,
        });
    }

    async findRootFolder(
        kbId: string
    ): Promise<KnowledgeItemFolderEntity | null> {
        return this.folderRepository.findOne({
            knowledgeBase: kbId,
            name: 'Root',
            parentFolder: null,
        });
    }

    async getTotal(
        find?: Record<string, any>,
        options?: IDatabaseGetTotalOptions
    ): Promise<number> {
        return this.folderRepository.getTotal(find, options);
    }

    async findOneById(
        id: string,
        options?: IDatabaseOptions
    ): Promise<KnowledgeItemFolderEntity | null> {
        return this.folderRepository.findOneById(id, options);
    }

    async findOne(
        find: Record<string, any>,
        options?: IDatabaseOptions
    ): Promise<KnowledgeItemFolderEntity | null> {
        return this.folderRepository.findOne(find, options);
    }

    async create(
        payload: {
            knowledgeBase: string;
            name: string;
            parentFolder?: string;
        },
        options?: IDatabaseCreateOptions
    ): Promise<KnowledgeItemFolderEntity> {
        const em = options?.em ?? this.em;

        const folder = new KnowledgeItemFolderEntity();
        folder.knowledgeBase = em.getReference(
            KnowledgeBaseEntity,
            payload.knowledgeBase
        );
        folder.name = payload.name;

        if (payload.parentFolder) {
            folder.parentFolder = em.getReference(
                KnowledgeItemFolderEntity,
                payload.parentFolder
            );
        }

        await em.persist(folder).flush();

        return folder;
    }

    async update(
        id: string,
        payload: {
            name?: string;
            parentFolder?: string;
        },
        options?: IDatabaseUpdateOptions
    ): Promise<KnowledgeItemFolderEntity> {
        const em = options?.em ?? this.em;

        const folder = await em.findOneOrFail(KnowledgeItemFolderEntity, id);

        if (payload.name !== undefined) {
            folder.name = payload.name;
        }

        if (payload.parentFolder !== undefined) {
            folder.parentFolder = payload.parentFolder
                ? em.getReference(
                      KnowledgeItemFolderEntity,
                      payload.parentFolder
                  )
                : null;
        }

        await em.persist(folder).flush();

        return folder;
    }

    async softDelete(
        id: string,
        options?: IDatabaseSoftDeleteOptions
    ): Promise<KnowledgeItemFolderEntity> {
        const em = options?.em ?? this.em;

        const folder = await em.findOneOrFail(KnowledgeItemFolderEntity, id);

        folder.deletedAt = new Date();

        await em.persist(folder).flush();

        return folder;
    }

    mapList(
        data: KnowledgeItemFolderEntity[]
    ): KnowledgeItemFolderResponseDto[] {
        return data.map(item => this.mapGet(item));
    }

    mapGet(data: KnowledgeItemFolderEntity): KnowledgeItemFolderResponseDto {
        return plainToInstance(KnowledgeItemFolderResponseDto, data, {
            excludeExtraneousValues: true,
        });
    }
}
