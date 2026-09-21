import {
    IDatabaseCreateOptions,
    IDatabaseDeleteManyOptions,
    IDatabaseDeleteOptions,
    IDatabaseFindAllOptions,
    IDatabaseGetTotalOptions,
    IDatabaseOptions,
    IDatabaseUpdateManyOptions,
    IDatabaseUpdateOptions,
} from '@app/common/database/interfaces/database.interface';
import { UserEntity } from '@app/modules/user/repository/entities/user.entity';
import { RAGCreateRequestDto } from '../dtos/request/rag.create.request.dto';
import { RAGGetResponseDto } from '../dtos/response/rag.get.response.dto';
import { RAGEntity } from '../repository/entities/rag.entity';

export interface IRAGService {
    findAll(
        find?: Record<string, any>,
        options?: IDatabaseFindAllOptions
    ): Promise<RAGEntity[]>;
    findAllWithChatbotAndAttachment(
        find?: Record<string, any>,
        options?: IDatabaseFindAllOptions
    ): Promise<RAGEntity[]>;
    findAllWithJoined(
        find?: Record<string, any>,
        options?: IDatabaseFindAllOptions
    ): Promise<RAGEntity[]>;
    getTotal(
        find?: Record<string, any>,
        options?: IDatabaseGetTotalOptions
    ): Promise<number>;
    findOneById(_id: string, options?: IDatabaseOptions): Promise<RAGEntity>;
    findOne(
        find: Record<string, any>,
        options?: IDatabaseOptions
    ): Promise<RAGEntity>;
    create: (
        payload: RAGCreateRequestDto,
        user: UserEntity,
        options?: IDatabaseCreateOptions
    ) => Promise<RAGEntity>;
    process: (
        rag: RAGEntity,
        options?: IDatabaseUpdateOptions
    ) => Promise<void>;
    complete: (
        rag: RAGEntity,
        embedding: number[],
        options?: IDatabaseUpdateOptions
    ) => Promise<void>;
    failed: (
        rag: RAGEntity,
        error: { code: number; reason: string },
        options?: IDatabaseUpdateOptions
    ) => Promise<void>;
    processMany: (
        repositories: RAGEntity[],
        options?: IDatabaseUpdateManyOptions
    ) => Promise<void>;
    completeMany: (
        payload: { rag: RAGEntity; embedding: number[] }[],
        options?: IDatabaseUpdateManyOptions
    ) => Promise<void>;
    failedMany: (
        payload: { rag: RAGEntity; error: { code: number; reason: string } }[],
        options?: IDatabaseUpdateManyOptions
    ) => Promise<void>;
    deleteMany: (
        payload: { rag: RAGEntity }[],
        options?: IDatabaseDeleteManyOptions
    ) => Promise<void>;
    delete: (
        payload: { rag: RAGEntity }[],
        options?: IDatabaseDeleteOptions
    ) => Promise<void>;

    mapGet: (rag: RAGEntity) => RAGGetResponseDto;
    mapList: (rag: RAGEntity) => any;
}
