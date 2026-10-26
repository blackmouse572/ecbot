import { IDatabaseFindAllOptions } from '@app/common/database/interfaces/database.interface';
import { FilterQuery, QueryOrder } from '@mikro-orm/postgresql';
import { Injectable } from '@nestjs/common';
import { ENUM_PAGINATION_ORDER_DIRECTION_TYPE } from 'src/common/pagination/enums/pagination.enum';
import { plainToInstance } from 'class-transformer';
import { ENUM_AWS_S3_ACCESSIBILITY } from 'src/modules/aws/enums/aws.enum';
import { AwsS3Service } from 'src/modules/aws/services/aws.s3.service';
import { KnowledgeItemAdminGetResponseDto } from '../dtos/response/knowledge-item.admin-get.response.dto';
import { KnowledgeItemAdminListResponseDto } from '../dtos/response/knowledge-item.admin-list.response.dto';
import { ENUM_KNOWLEDGE_BASE_ITEM_TYPE } from '../enums/knowledge-base-item-type.enum';
import { KnowledgeItemEntity } from '../repository/entities/knowledge-item.entity';
import { ChatbotKnowledgeItemRepository } from '../repository/repositories/chatbot-knowledge-item.repository';
import { KnowledgeItemRepository } from '../repository/repositories/knowledge-item.repository';

/** Read side of the admin knowledge pages: every item, any workspace. */
@Injectable()
export class KnowledgeItemAdminService {
    constructor(
        private readonly knowledgeItemRepository: KnowledgeItemRepository,
        private readonly chatbotKnowledgeItemRepository: ChatbotKnowledgeItemRepository,
        private readonly awsS3Service: AwsS3Service
    ) {}

    async findAll(
        find: Record<string, any>,
        options?: IDatabaseFindAllOptions
    ): Promise<KnowledgeItemAdminListResponseDto[]> {
        const items = await this.knowledgeItemRepository.find(
            this.where(find),
            {
                ...this.sizeOrder(options),
                populate: ['knowledgeBase.workspace'],
            }
        );
        const chunkCounts = await this.knowledgeItemRepository.countChunks(
            items.map(item => item.id)
        );
        return items.map(item =>
            plainToInstance(
                KnowledgeItemAdminListResponseDto,
                this.toPlain(item, chunkCounts.get(item.id) ?? 0),
                { excludeExtraneousValues: true }
            )
        );
    }

    // `size` is the list's name for the file size, an embedded column, and
    // items with no file (text, links) have none. They sort last either way,
    // and newest first among equal sizes so offset paging stays stable.
    private sizeOrder(
        options?: IDatabaseFindAllOptions
    ): IDatabaseFindAllOptions | undefined {
        const direction = options?.order?.size;
        if (!direction) return options;

        const { order: _order, ...rest } = options;
        const size =
            direction === ENUM_PAGINATION_ORDER_DIRECTION_TYPE.ASC
                ? QueryOrder.ASC_NULLS_LAST
                : QueryOrder.DESC_NULLS_LAST;
        // The interface types orderBy as flat; MikroORM takes the nested
        // embedded path.
        return {
            ...rest,
            orderBy: {
                attachment: { size },
                createdAt: QueryOrder.DESC,
                id: QueryOrder.ASC,
            } as unknown as Record<string, `${QueryOrder}`>,
        };
    }

    getTotal(find: Record<string, any>): Promise<number> {
        return this.knowledgeItemRepository.getTotal(this.where(find));
    }

    async findOneById(
        id: string
    ): Promise<KnowledgeItemAdminGetResponseDto | null> {
        const item = await this.findEntityById(id);
        if (!item) return null;

        const [chunkCounts, links, previewUrl] = await Promise.all([
            this.knowledgeItemRepository.countChunks([item.id]),
            this.chatbotKnowledgeItemRepository.findByKnowledgeItem(item.id),
            this.previewUrl(item),
        ]);
        const isUrl = item.type === ENUM_KNOWLEDGE_BASE_ITEM_TYPE.URL;
        const isText = item.type === ENUM_KNOWLEDGE_BASE_ITEM_TYPE.TEXT;

        return plainToInstance(
            KnowledgeItemAdminGetResponseDto,
            {
                ...this.toPlain(item, chunkCounts.get(item.id) ?? 0),
                sourceUrl:
                    item.metadata?.url ??
                    (isUrl ? item.content : item.metadata?.sourceLink),
                fileName: item.metadata?.fileName,
                mimeType: item.attachment?.mime ?? item.metadata?.mimeType,
                errorMessage: item.errorMessage ?? undefined,
                processedAt: item.processedAt,
                content: isText ? item.content : undefined,
                previewUrl,
                tags: item.tagArray,
                chatbots: links
                    .map(link => link.chatbot)
                    .filter(chatbot => !chatbot.deletedAt),
            },
            { excludeExtraneousValues: true }
        );
    }

    /** The item with its workspace and owner, for the admin write routes. */
    findEntityById(id: string): Promise<KnowledgeItemEntity | null> {
        return this.knowledgeItemRepository.findOne(
            { id, deletedAt: null },
            { populate: ['knowledgeBase.workspace.owner', 'tags'] }
        );
    }

    // The same link the owner's page previews: files sit in the private
    // bucket, so they get a short-lived signed URL; media is already public.
    private async previewUrl(
        item: KnowledgeItemEntity
    ): Promise<string | undefined> {
        if (!item.attachment) return undefined;
        if (item.type === ENUM_KNOWLEDGE_BASE_ITEM_TYPE.MEDIA) {
            return item.attachment.cdnUrl;
        }
        const signed = await this.awsS3Service.presignGetItem(
            item.attachment.key,
            { access: ENUM_AWS_S3_ACCESSIBILITY.PRIVATE }
        );
        return signed?.presignUrl ?? item.attachment.cdnUrl;
    }

    // `chatbot` is not a column of the item: it matches live links instead.
    private where(find: Record<string, any>): FilterQuery<KnowledgeItemEntity> {
        const { chatbot, ...rest } = find;
        return {
            deletedAt: null,
            ...rest,
            ...(chatbot && {
                chatbotLinks: { chatbot, isActive: true, deletedAt: null },
            }),
        };
    }

    private toPlain(
        item: KnowledgeItemEntity,
        chunkCount: number
    ): Record<string, unknown> {
        return {
            id: item.id,
            title: item.title,
            type: item.type,
            status: item.status,
            size: item.attachment?.size,
            chunkCount,
            workspace: item.knowledgeBase.workspace,
            createdAt: item.createdAt,
            updatedAt: item.updatedAt,
        };
    }
}
