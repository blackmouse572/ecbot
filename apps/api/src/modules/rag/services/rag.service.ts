import {
    IDatabaseCreateOptions,
    IDatabaseDeleteManyOptions,
    IDatabaseDeleteOptions,
    IDatabaseFindAllOptions,
    IDatabaseGetTotalOptions,
    IDatabaseOptions,
    IDatabaseSoftDeleteOptions,
    IDatabaseUpdateManyOptions,
    IDatabaseUpdateOptions,
} from '@app/common/database/interfaces/database.interface';
import { ChatbotEntity } from '@app/modules/chatbot/repository/entities/chatbot.entity';
import { UserEntity } from '@app/modules/user/repository/entities/user.entity';
import { WorkspaceEntity } from '@app/modules/workspace/repository/entities/workspace.entity';
import { EntityManager } from '@mikro-orm/postgresql';
import { Injectable } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import slugify from 'slugify';
import { EXTENSION_BY_MIME } from 'src/common/file/enums/file.enum';
import { RAGCreateRequestDto } from '../dtos/request/rag.create.request.dto';
import { RAGUploadFileRequestDto } from '../dtos/request/rag.upload-file.request.dto';
import { RAGGetResponseDto } from '../dtos/response/rag.get.response.dto';
import { ENUM_RAG_STATUS } from '../enums/rag.status.enum';
import { IRAGDoc } from '../interfaces/rag.interface';
import { IRAGService } from '../interfaces/rag.service.interface';
import { RAGEntity } from '../repository/entities/rag.entity';
import { RAGRepository } from '../repository/repositories/rag.repository';

@Injectable()
export class RAGService implements IRAGService {
    constructor(
        private readonly em: EntityManager,
        private readonly ragRepository: RAGRepository
    ) {}
    findAll(
        find?: Record<string, any>,
        options?: IDatabaseFindAllOptions
    ): Promise<RAGEntity[]> {
        return this.ragRepository.find(find, options);
    }
    findAllWithChatbotAndAttachment(
        find?: Record<string, any>,
        options?: IDatabaseFindAllOptions
    ): Promise<RAGEntity[]> {
        return this.ragRepository.find(find, {
            ...options,
            populate: ['chatbot', 'attachment'],
        });
    }
    findAllWithJoined(
        find?: Record<string, any>,
        options?: IDatabaseFindAllOptions
    ): Promise<RAGEntity[]> {
        return this.ragRepository.find(find, {
            ...options,
        });
    }
    getTotal(
        find?: Record<string, any>,
        options?: IDatabaseGetTotalOptions
    ): Promise<number> {
        return this.ragRepository.getTotal(find, options);
    }
    findOneById(id: string, options?: IDatabaseOptions): Promise<RAGEntity> {
        return this.ragRepository.findOneById(id, options);
    }
    findOne(
        find: Record<string, any>,
        options?: IDatabaseOptions
    ): Promise<RAGEntity> {
        return this.ragRepository.findOne(find, options);
    }
    create(
        payload: RAGCreateRequestDto,
        user: UserEntity,
        options?: IDatabaseCreateOptions
    ): Promise<RAGEntity> {
        const create: RAGEntity = new RAGEntity();
        const em = options?.em ?? this.em;
        create.chatbot = em.getReference(ChatbotEntity, payload.chatbot);
        create.attachment = {
            ...payload.attachment,
            size: payload.attachment.size || 0,
        };
        create.workspace = em.getReference(WorkspaceEntity, payload.workspace);
        create.status = ENUM_RAG_STATUS.PENDING;
        create.createdBy = user.id;
        return this.ragRepository.create(create, options);
    }
    async process(
        rag: RAGEntity,
        options?: IDatabaseUpdateOptions
    ): Promise<void> {
        rag.status = ENUM_RAG_STATUS.IN_PROGRESS;
        await this.ragRepository.save(rag, options);
    }
    async complete(
        rag: RAGEntity,
        embedding: number[],
        options?: IDatabaseUpdateOptions
    ): Promise<void> {
        rag.status = ENUM_RAG_STATUS.COMPLETED;
        rag.embedding = embedding;
        await this.ragRepository.save(rag, options);
    }
    async failed(
        rag: RAGEntity,
        error: {
            code: number;
            reason: string;
        },
        options?: IDatabaseUpdateOptions
    ): Promise<void> {
        rag.status = ENUM_RAG_STATUS.FAILED;
        rag.errorCode = error.code;
        rag.errorMessage = error.reason;
        await this.ragRepository.save(rag, options);
    }
    async processMany(
        _repositories: RAGEntity[],
        options?: IDatabaseUpdateManyOptions
    ): Promise<void> {
        await this.ragRepository.updateMany(
            {
                id: { $in: _repositories.map(r => r.id) },
            },
            {
                status: ENUM_RAG_STATUS.IN_PROGRESS,
            },
            options
        );
    }

    async completeMany(
        payload: { rag: RAGEntity; embedding: number[] }[],
        options?: IDatabaseUpdateManyOptions
    ): Promise<void> {
        await Promise.all(
            payload.map(({ rag, embedding }) => {
                rag.status = ENUM_RAG_STATUS.COMPLETED;
                rag.embedding = embedding;
                return this.complete(rag, embedding, options);
            })
        );
    }

    async failedMany(
        payload: { rag: RAGEntity; error: { code: number; reason: string } }[],
        options?: IDatabaseUpdateManyOptions
    ): Promise<void> {
        await Promise.all(
            payload.map(({ rag, error }) => {
                rag.status = ENUM_RAG_STATUS.FAILED;
                rag.errorCode = error.code;
                rag.errorMessage = error.reason;
                return this.failed(rag, error, options);
            })
        );
    }

    async deleteMany(
        payload: { rag: RAGEntity }[],
        options?: IDatabaseDeleteManyOptions
    ): Promise<void> {
        const ids = payload.map(item => item.rag.id);
        await this.ragRepository.deleteMany({ id: { $in: ids } }, options);
    }

    async delete(
        payload: { rag: RAGEntity }[],
        options?: IDatabaseDeleteOptions
    ): Promise<void> {
        for (const { rag } of payload) {
            await this.ragRepository.delete({ id: rag.id }, options);
        }
    }

    mapGet(rag: RAGEntity): RAGGetResponseDto {
        // Use class-transformer or plain mapping as in user.service.ts
        // Assuming plainToInstance is imported if needed
        return plainToInstance(RAGGetResponseDto, rag);
    }

    mapList(rag: RAGEntity): any {
        // Implement as needed, for now just return the plain object
        return rag;
    }

    generateS3Key(
        chatbotId: string,
        workspaceId: string,
        { mime, name }: RAGUploadFileRequestDto
    ): string {
        const nameOnly = name.includes('.')
            ? name.substring(0, name.lastIndexOf('.'))
            : name;
        const extension = EXTENSION_BY_MIME[mime] ?? 'txt';
        const slug = slugify(nameOnly, {
            lower: true,
            trim: true,
            strict: true,
            replacement: '-',
        });
        return `rag/${workspaceId}/${chatbotId}/${slug}.${extension}`;
    }

    async softDelete(
        rag: RAGEntity,
        options?: IDatabaseSoftDeleteOptions
    ): Promise<void> {
        await this.ragRepository.softDelete(rag, options);
    }

    joinAttachment(rag: RAGEntity): Promise<IRAGDoc> {
        return this.ragRepository.populate(rag, ['attachment']);
    }
}
