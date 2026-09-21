import { DatabaseRepository } from '@app/common/database/bases/database.repository';
import { EntityManager } from '@mikro-orm/postgresql';
import { Injectable } from '@nestjs/common';
import { ENUM_RAG_STATUS } from '../../enums/rag.status.enum';
import { RAGEntity } from '../entities/rag.entity';

@Injectable()
export class RAGRepository extends DatabaseRepository<RAGEntity> {
    constructor(em: EntityManager) {
        super(em, RAGEntity);
    }

    async findByWorkspace(workspaceId: string): Promise<RAGEntity[]> {
        return this.find(
            { workspace: workspaceId },
            {
                populate: ['workspace', 'chatbot', 'attachment'],
                orderBy: { createdAt: 'DESC' },
            }
        );
    }

    async findByChatbot(chatbotId: string): Promise<RAGEntity[]> {
        return this.find(
            { chatbot: chatbotId },
            {
                populate: ['workspace', 'chatbot', 'attachment'],
                orderBy: { createdAt: 'DESC' },
            }
        );
    }

    async findByStatus(
        status: ENUM_RAG_STATUS,
        workspaceId?: string
    ): Promise<RAGEntity[]> {
        const filters: any = { status };
        if (workspaceId) {
            filters.workspace = workspaceId;
        }
        return this.find(filters, {
            populate: ['workspace', 'chatbot', 'attachment'],
            orderBy: { createdAt: 'DESC' },
        });
    }

    async findPendingProcessing(): Promise<RAGEntity[]> {
        return this.find(
            { status: ENUM_RAG_STATUS.PENDING },
            {
                populate: ['workspace', 'chatbot', 'attachment'],
                orderBy: { createdAt: 'ASC' },
            }
        );
    }

    async findWithErrors(): Promise<RAGEntity[]> {
        return this.find(
            { errorCode: { $ne: null } },
            {
                populate: ['workspace', 'chatbot', 'attachment'],
                orderBy: { createdAt: 'DESC' },
            }
        );
    }

    async markAsProcessed(ragId: string): Promise<RAGEntity> {
        const rag = await this.findOneById(ragId);
        rag.status = ENUM_RAG_STATUS.COMPLETED;
        await this.em.persistAndFlush(rag);
        return rag;
    }

    async markAsError(
        ragId: string,
        errorCode: number,
        errorMessage: string
    ): Promise<RAGEntity> {
        const rag = await this.findOneById(ragId);
        rag.status = ENUM_RAG_STATUS.FAILED;
        rag.errorCode = errorCode;
        rag.errorMessage = errorMessage;
        await this.em.persistAndFlush(rag);
        return rag;
    }
}
