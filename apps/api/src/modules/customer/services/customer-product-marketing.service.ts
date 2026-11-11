import { ENUM_ORDER_STATUS } from '@app/modules/order/enums/order.enum';
import { OrderItemEntity } from '@app/modules/order/repository/entities/order-item.entity';
import { ProductGroupEntity } from '@app/modules/order/repository/entities/product-group.entity';
import { UniqueConstraintViolationException } from '@mikro-orm/core';
import { EntityManager } from '@mikro-orm/postgresql';
import { Injectable, NotFoundException } from '@nestjs/common';
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
import { customerProductReactionResponse } from '../utils/customer-product-reaction.util';

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
        const args = [customerId, workspaceId, productGroupId, until] as const;

        try {
            return await this.applyDefer(...args, context, this.em.fork());
        } catch (error: unknown) {
            // Two writes for the same group raced to create the row: the
            // other one won, so this run finds it and updates it.
            if (!(error instanceof UniqueConstraintViolationException))
                throw error;

            return this.applyDefer(...args, context, this.em.fork());
        }
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
        return customerProductReactionResponse(reaction);
    }

    private async applyDefer(
        customerId: string,
        workspaceId: string,
        productGroupId: string,
        until: Date,
        context: ICustomerMarketingChangeContext,
        em: EntityManager
    ): Promise<CustomerProductReactionEntity | null> {
        const existing = await this.reactionRepository.findOne(
            { customer: customerId, productGroup: productGroupId },
            { populate: [], em }
        );

        if (until.getTime() <= Date.now()) return existing;

        if (
            await this.alreadyRecorded(
                customerId,
                ENUM_MARKETING_EVENT_KIND.REACTION,
                productGroupId,
                context,
                em
            )
        ) {
            return existing;
        }

        const reaction = existing ?? new CustomerProductReactionEntity();

        if (!existing) {
            reaction.workspace = em.getReference(WorkspaceEntity, workspaceId);
            reaction.customer = em.getReference(CustomerEntity, customerId);
            reaction.productGroup = em.getReference(
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
            },
            em
        );
        em.persist(reaction);
        await em.flush();

        return reaction;
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
        context: ICustomerMarketingChangeContext,
        em: EntityManager = this.em
    ): Promise<boolean> {
        if (!context.messageId) return false;

        const count = await em.count(MarketingEventEntity, {
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
