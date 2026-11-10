import { ENUM_ORDER_STATUS } from '@app/modules/order/enums/order.enum';
import { OrderItemEntity } from '@app/modules/order/repository/entities/order-item.entity';
import { ProductGroupEntity } from '@app/modules/order/repository/entities/product-group.entity';
import { EntityManager } from '@mikro-orm/postgresql';
import { Injectable, NotFoundException } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { WorkspaceEntity } from 'src/modules/workspace/repository/entities/workspace.entity';
import { CustomerProductReactionGetResponseDto } from '../dtos/response/customer-product-reaction.get.response.dto';
import { ENUM_MARKETING_EVENT_KIND } from '../enums/customer-marketing.enum';
import {
    ICustomerMarketingChangeContext,
    ICustomerProductIntentInput,
} from '../interfaces/customer-marketing.interface';
import { CustomerProductReactionEntity } from '../repository/entities/customer-product-reaction.entity';
import { CustomerEntity } from '../repository/entities/customer.entity';
import { MarketingEventEntity } from '../repository/entities/marketing-event.entity';
import { CustomerProductReactionRepository } from '../repository/repositories/customer-product-reaction.repository';
import {
    activeProductIntents,
    ICustomerProductIntent,
} from '../utils/customer-product-intent.util';
import { CustomerMarketingService } from './customer-marketing.service';

const toDay = (date?: Date | null) => date?.toISOString().slice(0, 10) ?? null;

/**
 * The per product group layer: "Tạm hoãn <group> đến <date>" and dated
 * intent (interest, price question). Writes are idempotent per message, so
 * the classifier can re-read a conversation.
 */
@Injectable()
export class CustomerProductMarketingService {
    constructor(
        private readonly em: EntityManager,
        private readonly reactionRepository: CustomerProductReactionRepository,
        private readonly marketingService: CustomerMarketingService
    ) {}

    /** A date already past (an old message in the backfill) does nothing. */
    async deferProductGroup(
        customerId: string,
        workspaceId: string,
        productGroupId: string,
        until: Date,
        context: ICustomerMarketingChangeContext
    ): Promise<CustomerProductReactionEntity | null> {
        await this.marketingService.assertCustomer(customerId, workspaceId);
        await this.assertProductGroup(productGroupId, workspaceId);
        const existing = await this.findReaction(customerId, productGroupId);
        if (until.getTime() <= Date.now()) return existing;
        if (
            await this.alreadyRecorded(
                customerId,
                ENUM_MARKETING_EVENT_KIND.REACTION,
                productGroupId,
                context
            )
        ) {
            return existing;
        }

        const reaction = existing ?? new CustomerProductReactionEntity();
        if (!existing) {
            reaction.workspace = this.em.getReference(
                WorkspaceEntity,
                workspaceId
            );
            reaction.customer = this.em.getReference(
                CustomerEntity,
                customerId
            );
            reaction.productGroup = this.em.getReference(
                ProductGroupEntity,
                productGroupId
            );
        }
        const before = existing?.until ?? null;
        reaction.until = until;
        reaction.reason = context.reason ?? null;
        this.marketingService.addEvent(
            reaction,
            ENUM_MARKETING_EVENT_KIND.REACTION,
            {
                ...context,
                productGroupId,
                oldValue: toDay(before),
                newValue: toDay(until),
            }
        );
        this.em.persist(reaction);
        await this.em.flush();
        return reaction;
    }

    /** The group can be offered again. */
    async clearProductGroup(
        customerId: string,
        workspaceId: string,
        productGroupId: string,
        context: ICustomerMarketingChangeContext
    ): Promise<void> {
        await this.marketingService.assertCustomer(customerId, workspaceId);
        const reaction = await this.findReaction(customerId, productGroupId);
        if (!reaction) return;
        this.marketingService.addEvent(
            reaction,
            ENUM_MARKETING_EVENT_KIND.REACTION,
            {
                ...context,
                productGroupId,
                oldValue: toDay(reaction.until),
                newValue: null,
            }
        );
        this.em.remove(reaction);
        await this.em.flush();
    }

    /**
     * A dated INTENT event at the customer's message time, then the stage
     * moves forward (never back, so a repeat buyer stays one).
     */
    async recordIntent(
        customerId: string,
        workspaceId: string,
        input: ICustomerProductIntentInput,
        context: ICustomerMarketingChangeContext
    ): Promise<void> {
        await this.marketingService.assertCustomer(customerId, workspaceId);
        const productGroupId = input.productGroupId ?? null;
        if (productGroupId) {
            await this.assertProductGroup(productGroupId, workspaceId);
        }
        if (
            await this.alreadyRecorded(
                customerId,
                ENUM_MARKETING_EVENT_KIND.INTENT,
                productGroupId,
                context
            )
        ) {
            return;
        }
        this.marketingService.addEvent(
            {
                workspace: this.em.getReference(WorkspaceEntity, workspaceId),
                customer: this.em.getReference(CustomerEntity, customerId),
            },
            ENUM_MARKETING_EVENT_KIND.INTENT,
            {
                ...context,
                productGroupId,
                oldValue: null,
                newValue: input.stage,
                at: input.occurredAt,
            }
        );
        // Flushes the intent event too.
        await this.marketingService.setStage(
            customerId,
            workspaceId,
            input.stage,
            { ...context }
        );
    }

    listActiveReactions(
        customerId: string
    ): Promise<CustomerProductReactionEntity[]> {
        return this.reactionRepository.find(
            { customer: customerId, until: { $gt: new Date() } },
            { populate: ['productGroup'], orderBy: { until: 'ASC' } }
        );
    }

    /** Includes intents of Customers merged into this one. */
    async listActiveIntents(
        customerId: string
    ): Promise<ICustomerProductIntent[]> {
        const merged = await this.em.find(
            CustomerEntity,
            { mergedIntoCustomerId: customerId },
            { fields: ['id'] }
        );
        const events = await this.em.find(
            MarketingEventEntity,
            {
                customer: { $in: [customerId, ...merged.map(c => c.id)] },
                kind: ENUM_MARKETING_EVENT_KIND.INTENT,
            },
            { populate: ['productGroup'], orderBy: { createdAt: 'DESC' } }
        );
        if (!events.length) return [];
        const items = await this.em.find(
            OrderItemEntity,
            {
                order: {
                    customer: customerId,
                    status: ENUM_ORDER_STATUS.CONFIRMED,
                    deletedAt: null,
                },
            },
            { populate: ['order'] }
        );
        return activeProductIntents(
            events,
            items.map(item => ({
                orderedAt: item.order.orderedAt,
                productGroupIds: [item.productGroup?.id ?? null],
            }))
        );
    }

    mapReaction(
        reaction: CustomerProductReactionEntity
    ): CustomerProductReactionGetResponseDto {
        return plainToInstance(
            CustomerProductReactionGetResponseDto,
            {
                productGroupId: reaction.productGroup.id,
                productGroupName: reaction.productGroup.name,
                until: reaction.until,
                reason: reaction.reason ?? null,
            },
            { excludeExtraneousValues: true }
        );
    }

    findReaction(
        customerId: string,
        productGroupId: string
    ): Promise<CustomerProductReactionEntity | null> {
        return this.reactionRepository.findOne(
            { customer: customerId, productGroup: productGroupId },
            { populate: ['productGroup'] }
        );
    }

    private async alreadyRecorded(
        customerId: string,
        kind: ENUM_MARKETING_EVENT_KIND,
        productGroupId: string | null,
        context: ICustomerMarketingChangeContext
    ): Promise<boolean> {
        if (!context.messageId) return false;
        const count = await this.em.count(MarketingEventEntity, {
            customer: customerId,
            kind,
            messageId: context.messageId,
            productGroup: productGroupId,
        });
        return count > 0;
    }

    // A product group of another workspace is a 404.
    private async assertProductGroup(
        productGroupId: string,
        workspaceId: string
    ): Promise<void> {
        const group = await this.em.findOne(ProductGroupEntity, {
            id: productGroupId,
            workspace: workspaceId,
        });
        if (!group) {
            throw new NotFoundException({
                statusCode: 404,
                message: 'order.productGroup.error.notFound',
            });
        }
    }
}
