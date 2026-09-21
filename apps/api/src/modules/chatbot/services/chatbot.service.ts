import { ENUM_APP_STATUS_CODE_ERROR } from '@app/app/enums/app.status-code.enum';
import {
    IDatabaseCreateOptions,
    IDatabaseDeleteManyOptions,
    IDatabaseFindAllOptions,
    IDatabaseGetTotalOptions,
    IDatabaseOptions,
    IDatabaseSaveOptions,
} from '@app/common/database/interfaces/database.interface';
import { AccountEntity } from '@app/modules/account/repository/entities/account.entity';
import { CloneChatbotRequestDto } from '../dtos/request/chatbot.clone.request.dto';
import { IChatbotService } from '@app/modules/chatbot/interfaces/chatbot.service.interface';
import { Collection, EntityManager, FilterQuery, wrap } from '@mikro-orm/core';
import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { ChatbotCreateRequestDto } from '../dtos/request/chatbot.create.request.dto';
import { ChatbotUpdateRequestDto } from '../dtos/request/chatbot.update.request.dto';
import { ChatbotGetDetailResponseDto } from '../dtos/response/chatbot.detail.response.dto';
import { ChatbotListResponseDto } from '../dtos/response/chatbot.list.response.dto';
import {
    ENUM_CHATBOT_MODEL_PROVIDER,
    ENUM_CHATBOT_STATUS,
} from '../enums/chatbot.enum';
import { ChatbotEntity } from '../repository/entities/chatbot.entity';
import { ChatbotRepository } from '../repository/repositories/chatbot.repository';
import { WorkspaceEntity } from 'src/modules/workspace/repository/entities/workspace.entity';
import { ChatbotToolEntity } from 'src/modules/tool/repository/entities/chatbot-tool.entity';
import { ChatbotKnowledgeItemEntity } from 'src/modules/knowledge-base/repository/entities/chatbot-knowledge-item.entity';
import { ChatbotCacheService } from 'src/modules/ai-cache/services/chatbot-cache.service';
import { RAGEntity } from 'src/modules/rag/repository/entities/rag.entity';
import { ENUM_RAG_STATUS } from 'src/modules/rag/enums/rag.status.enum';

@Injectable()
export class ChatbotService implements IChatbotService {
    private readonly logger = new Logger(ChatbotService.name);

    constructor(
        private readonly em: EntityManager,
        private readonly chatbotRepository: ChatbotRepository,
        private readonly chatbotCacheService: ChatbotCacheService
    ) {}

    findAll(
        find?: FilterQuery<ChatbotEntity>,
        options?: IDatabaseFindAllOptions
    ): Promise<ChatbotEntity[]> {
        return this.chatbotRepository.find(find, options);
    }

    getTotal(
        find?: FilterQuery<ChatbotEntity>,
        options?: IDatabaseGetTotalOptions
    ): Promise<number> {
        return this.chatbotRepository.getTotal(find, options);
    }

    findOneById(
        id: string,
        options?: IDatabaseOptions
    ): Promise<ChatbotEntity> {
        if (!id) {
            throw new NotFoundException({
                statusCode: ENUM_APP_STATUS_CODE_ERROR.NOT_FOUND,
                message: 'chatbot.error.notFound',
            });
        }
        return this.chatbotRepository.findOne(
            {
                id,
                deletedAt: null,
            },
            options
        );
    }

    findOne(
        find?: FilterQuery<ChatbotEntity>,
        options?: IDatabaseOptions
    ): Promise<ChatbotEntity> {
        return this.chatbotRepository.findOne(find, options);
    }

    findOneWithAccounts(id: string, options?: IDatabaseOptions) {
        // TODO: need update the method
        if (!id) {
            throw new NotFoundException({
                statusCode: ENUM_APP_STATUS_CODE_ERROR.NOT_FOUND,
                message: 'chatbot.error.notFound',
            });
        }
        return this.chatbotRepository.findOne(
            {
                id,
                deletedAt: null,
            },
            options
        );
    }

    /**
     * Builds the entity fields for a new chatbot from the create DTO,
     * deriving `modelProvider` from the OpenRouter model id prefix
     * (e.g. `anthropic/claude-sonnet-4.5` -> `anthropic`) since the
     * client no longer sends it explicitly.
     */
    buildCreateEntity(createDto: ChatbotCreateRequestDto): Omit<
        ChatbotCreateRequestDto,
        'accounts'
    > & {
        modelProvider: ENUM_CHATBOT_MODEL_PROVIDER;
    } {
        const { accounts, ...fieldsWithoutAccounts } = createDto;
        const modelProvider = fieldsWithoutAccounts.modelTextName.split(
            '/'
        )[0] as ENUM_CHATBOT_MODEL_PROVIDER;

        return { ...fieldsWithoutAccounts, modelProvider };
    }

    async create(
        createDto: ChatbotCreateRequestDto,
        options?: IDatabaseCreateOptions & { actionBy?: string }
    ): Promise<ChatbotEntity> {
        // Extract accounts if provided and convert IDs to references
        const accountIds = createDto.accounts || [];
        const entityFields = this.buildCreateEntity(createDto);

        // Create entity without accounts first
        const entity = plainToInstance(ChatbotEntity, entityFields);

        // Create the chatbot
        const chatbot = await this.chatbotRepository.create<ChatbotEntity>(
            entity,
            options
        );

        // Link accounts if provided
        for (const accountId of accountIds) {
            chatbot.accounts.add(
                this.em.getReference(AccountEntity, accountId)
            );
        }

        return chatbot;
    }

    async update(
        repository: ChatbotEntity,
        updateDto: ChatbotUpdateRequestDto,
        options?: IDatabaseSaveOptions & { actionBy?: string }
    ): Promise<ChatbotEntity> {
        if (!repository) {
            throw new NotFoundException({
                statusCode: ENUM_APP_STATUS_CODE_ERROR.NOT_FOUND,
                message: 'chatbot.error.notFound',
            });
        }

        // Derive modelProvider from the OpenRouter id when the model changes,
        // since the client no longer sends modelProvider explicitly.
        const modelProviderUpdate = updateDto.modelTextName
            ? {
                  modelProvider: updateDto.modelTextName.split(
                      '/'
                  )[0] as ENUM_CHATBOT_MODEL_PROVIDER,
              }
            : {};

        // Handle accounts separately if provided
        const hasAccountUpdates =
            Array.isArray(updateDto.accounts) && updateDto.accounts.length > 0;
        const { accounts: accountIds, ...fieldsWithoutAccounts } = updateDto;
        const assignableFields = hasAccountUpdates
            ? fieldsWithoutAccounts
            : updateDto;

        wrap(repository).assign(
            { ...assignableFields, ...modelProviderUpdate },
            { em: this.chatbotRepository.getEntityManager() }
        );

        if (hasAccountUpdates) {
            // Update accounts
            if (!repository.accounts) {
                repository.accounts = new Collection(repository);
            }

            // Clear existing accounts and add new ones
            repository.accounts.removeAll();
            for (const accountId of accountIds ?? []) {
                repository.accounts.add(
                    this.em.getReference(AccountEntity, accountId)
                );
            }
        }

        const saved = await this.chatbotRepository.save(repository, options);
        // apps/ai caches this config (model, prompt, guardrails) per chatbot.
        await this.chatbotCacheService.invalidate(saved.id);
        return saved;
    }

    softDelete(
        repository: ChatbotEntity,
        options?: IDatabaseSaveOptions & { actionBy?: string }
    ): Promise<ChatbotEntity> {
        if (!repository) {
            throw new NotFoundException({
                statusCode: ENUM_APP_STATUS_CODE_ERROR.NOT_FOUND,
                message: 'chatbot.error.notFound',
            });
        }
        repository.deletedAt = new Date();
        return this.chatbotRepository.save(repository, options);
    }

    async deleteMany(
        find?: Record<string, any>,
        options?: IDatabaseDeleteManyOptions
    ): Promise<boolean> {
        const result = await this.chatbotRepository.deleteMany(find, options);
        return !!(result && (result as any).deletedCount > 0);
    }

    // Shared by mapList/mapDetails: strips MikroORM's entity wrapper and
    // maps through the given response DTO's @Expose()d fields only.
    private toResponseDto<T>(dtoClass: new () => T, chatbot: ChatbotEntity): T {
        return plainToInstance(dtoClass, wrap(chatbot).toObject(), {
            excludeExtraneousValues: true,
        });
    }

    mapList(chatbots: ChatbotEntity[]): ChatbotListResponseDto[] {
        return chatbots.map(chatbot =>
            this.toResponseDto(ChatbotListResponseDto, chatbot)
        );
    }

    mapDetails(chatbot: ChatbotEntity): ChatbotGetDetailResponseDto {
        return this.toResponseDto(ChatbotGetDetailResponseDto, chatbot);
    }

    async active(
        repository: ChatbotEntity,
        options?: IDatabaseSaveOptions & { actionBy?: string }
    ): Promise<boolean> {
        if (repository.status === ENUM_CHATBOT_STATUS.ACTIVE) {
            return Promise.resolve(true);
        }
        repository.status = ENUM_CHATBOT_STATUS.ACTIVE;
        await this.chatbotRepository.save(repository, options);
        return true;
    }

    async inactive(
        repository: ChatbotEntity,
        options?: IDatabaseSaveOptions & { actionBy?: string }
    ): Promise<boolean> {
        if (repository.status === ENUM_CHATBOT_STATUS.INACTIVE) {
            return Promise.resolve(true);
        }
        repository.status = ENUM_CHATBOT_STATUS.INACTIVE;
        await this.chatbotRepository.save(repository, options);
        return true;
    }

    async archive(
        repository: ChatbotEntity,
        options?: IDatabaseSaveOptions & { actionBy?: string }
    ): Promise<boolean> {
        if (repository.status === ENUM_CHATBOT_STATUS.ARCHIVED) {
            return Promise.resolve(true);
        }
        repository.status = ENUM_CHATBOT_STATUS.ARCHIVED;
        await this.chatbotRepository.save(repository, options);
        return true;
    }

    async unarchive(
        repository: ChatbotEntity,
        options?: IDatabaseSaveOptions & { actionBy?: string }
    ): Promise<boolean> {
        if (repository.status !== ENUM_CHATBOT_STATUS.ARCHIVED) {
            return Promise.resolve(true);
        }
        repository.status = ENUM_CHATBOT_STATUS.INACTIVE;
        await this.chatbotRepository.save(repository, options);
        return true;
    }

    async linkAccount(
        repository: ChatbotEntity,
        accountId: string,
        options?: IDatabaseSaveOptions & { actionBy?: string }
    ): Promise<boolean> {
        if (!repository) {
            throw new NotFoundException({
                statusCode: ENUM_APP_STATUS_CODE_ERROR.NOT_FOUND,
                message: 'chatbot.error.notFound',
            });
        }

        // Ensure accounts collection is initialized
        if (!repository.accounts) {
            repository.accounts = new Collection(repository);
        }

        // Check if account already exists in the collection
        const accountExists = repository.accounts
            .getItems()
            .some(acc => acc.id === accountId);

        if (!accountExists) {
            // Add the account to the collection
            const accountEntity = { id: accountId } as any;
            repository.accounts.add(accountEntity);
            await this.chatbotRepository.save(repository, options);
        }

        return true;
    }

    async unlinkAccount(
        repository: ChatbotEntity,
        accountId: string,
        options?: IDatabaseSaveOptions & { actionBy?: string }
    ): Promise<boolean> {
        if (!repository) {
            throw new NotFoundException({
                statusCode: ENUM_APP_STATUS_CODE_ERROR.NOT_FOUND,
                message: 'chatbot.error.notFound',
            });
        }

        if (repository.accounts) {
            const accountToRemove = repository.accounts
                .getItems()
                .find(acc => acc.id === accountId);
            if (accountToRemove) {
                repository.accounts.remove(accountToRemove);
                await this.chatbotRepository.save(repository, options);
            }
        }

        return true;
    }

    async linkBatchAccounts(
        chatbot: ChatbotEntity,
        accountIds: string[],
        options?: IDatabaseSaveOptions & { actionBy?: string }
    ): Promise<ChatbotEntity> {
        if (!chatbot.accounts) {
            chatbot.accounts = new Collection(chatbot);
        }

        // The chatbot is loaded without its accounts collection, so initialize
        // it before reading — getItems() throws on an uninitialized collection.
        if (!chatbot.accounts.isInitialized()) {
            await chatbot.accounts.init();
        }

        const existingIds = chatbot.accounts.getItems().map(acc => acc.id);
        const newAccountIds = accountIds.filter(
            id => !existingIds.includes(id)
        );

        if (newAccountIds.length > 0) {
            newAccountIds.forEach(accountId => {
                chatbot.accounts.add(
                    this.em.getReference(AccountEntity, accountId)
                );
            });
            return this.chatbotRepository.save(chatbot, options);
        }

        return chatbot;
    }

    async unlinkBatchAccounts(
        chatbot: ChatbotEntity,
        accountIds: string[],
        options?: IDatabaseSaveOptions & { actionBy?: string }
    ): Promise<ChatbotEntity> {
        if (!chatbot.accounts) {
            return chatbot;
        }

        // The chatbot is loaded without its accounts collection, so initialize
        // it before reading — getItems() throws on an uninitialized collection.
        if (!chatbot.accounts.isInitialized()) {
            await chatbot.accounts.init();
        }

        const accountsToRemove = chatbot.accounts
            .getItems()
            .filter(acc => accountIds.includes(acc.id));

        if (accountsToRemove.length > 0) {
            accountsToRemove.forEach(acc => {
                chatbot.accounts.remove(acc);
            });
            return this.chatbotRepository.save(chatbot, options);
        }

        return chatbot;
    }

    async clone(
        sourceId: string,
        workspaceId: string,
        dto: CloneChatbotRequestDto,
        options?: IDatabaseSaveOptions & { actionBy?: string }
    ): Promise<ChatbotEntity> {
        const source = await this.chatbotRepository.findOne({
            id: sourceId,
            workspace: workspaceId,
            deletedAt: null,
        });

        if (!source) {
            throw new NotFoundException({
                statusCode: ENUM_APP_STATUS_CODE_ERROR.NOT_FOUND,
                message: 'chatbot.error.notFound',
            });
        }

        const cloneName = dto.name || `${source.name} (Copy)`;
        const cloneAvatar = dto.avatar ?? source.avatar;

        const em = this.chatbotRepository.getEntityManager();

        const cloned = em.create(ChatbotEntity, {
            name: cloneName,
            avatar: cloneAvatar,
            generalKnowledge: source.generalKnowledge,
            workspace: em.getReference(WorkspaceEntity, workspaceId),
            typingIndicator: source.typingIndicator,
            autoRead: source.autoRead,
            status: ENUM_CHATBOT_STATUS.INACTIVE,
            type: source.type,
            primaryLanguage: source.primaryLanguage,
            deferedLanguage: source.deferedLanguage,
            welcomeMessage: source.welcomeMessage,
            fallbackMessage: source.fallbackMessage,
            modelProvider: source.modelProvider,
            modelTextName: source.modelTextName,
            modelTemperature: source.modelTemperature,
            maxTokens: source.maxTokens,
            // Spend caps travel with the clone: copying a capped bot into an
            // uncapped one silently widens what it may spend.
            dailyTokenCap: source.dailyTokenCap,
            monthlyTokenCap: source.monthlyTokenCap,
            handoffFallbackThreshold: source.handoffFallbackThreshold,
            handoffMessage: source.handoffMessage,
            handoffKeywords: source.handoffKeywords,
            guardrailEnabled: source.guardrailEnabled,
            guardrailModelEnabled: source.guardrailModelEnabled,
            guardrailCustomInstruction: source.guardrailCustomInstruction,
            guardrailEscalateOnBlock: source.guardrailEscalateOnBlock,
            followupRules: source.followupRules,
        });

        // Persist without flushing so the chatbot row and every junction row
        // commit together in a single flush (transaction) — a mid-way failure
        // leaves no orphaned half-cloned bot. cloned.id is a client-generated
        // uuid, so it's already available for the junction rows below.
        em.persist(cloned);

        if (dto.cloneTools !== false) {
            const sourceTools = await em.find(ChatbotToolEntity, {
                chatbot: source.id,
                deleted: false,
            });

            for (const ct of sourceTools) {
                em.create(ChatbotToolEntity, {
                    chatbot: cloned.id,
                    tool: ct.tool,
                    enabled: ct.enabled,
                    enabledActions: ct.enabledActions,
                });
            }
        }

        if (dto.cloneKnowledgeItems !== false) {
            const sourceItems = await em.find(ChatbotKnowledgeItemEntity, {
                chatbot: source.id,
                deletedAt: null,
            });

            for (const ci of sourceItems) {
                em.create(ChatbotKnowledgeItemEntity, {
                    chatbot: cloned.id,
                    knowledgeItem: ci.knowledgeItem,
                    isActive: ci.isActive,
                    priority: ci.priority,
                });
            }
        }

        if (dto.cloneRags !== false) {
            const sourceRags = await em.find(RAGEntity, {
                chatbot: source.id,
                workspace: workspaceId,
                deletedAt: null,
            });

            for (const rag of sourceRags) {
                em.create(RAGEntity, {
                    chatbot: cloned.id,
                    workspace: em.getReference(WorkspaceEntity, workspaceId),
                    attachment: rag.attachment,
                    status: ENUM_RAG_STATUS.PENDING,
                });
            }
        }

        await em.flush();

        return cloned;
    }
}
