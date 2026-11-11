import { ProductGroupRepository } from '@app/modules/order/repository/repositories/product-group.repository';
import { Injectable, Logger } from '@nestjs/common';
import { CUSTOMER_MARKETING_DEFER_DAYS } from '../constants/customer-marketing.constant';
import {
    ENUM_CUSTOMER_JOURNEY_STAGE,
    ENUM_MARKETING_EVENT_ACTOR,
    ENUM_MARKETING_EVENT_KIND,
} from '../enums/customer-marketing.enum';
import { ICustomerMarketingChangeContext } from '../interfaces/customer-marketing.interface';
import {
    ICustomerMarketingSignal,
    ICustomerMarketingSignalProductGroup,
    ICustomerMarketingSignalTarget,
} from '../interfaces/customer-marketing-signal.interface';
import { MarketingEventRepository } from '../repository/repositories/marketing-event.repository';
import { CustomerMarketingService } from './customer-marketing.service';
import { CustomerProductMarketingService } from './customer-product-marketing.service';

const DAY_MS = 86_400_000;

// Written in this order: an intent is kept once per message and product
// group, so a price question must land before interest in the same group.
const KIND_ORDER: ICustomerMarketingSignal['kind'][] = [
    'asked_price',
    'interest',
    'later',
    'hostile',
];

/**
 * Applies the classifier's marketing signals (#500) through the label rules
 * of #499: dated intent, "Tạm hoãn <group>", the Khó chịu flag. Each change
 * is a CLASSIFIER event quoting the customer's message. Re-reading a
 * conversation writes nothing twice.
 */
@Injectable()
export class CustomerMarketingSignalService {
    private readonly logger = new Logger(CustomerMarketingSignalService.name);

    constructor(
        private readonly productMarketingService: CustomerProductMarketingService,
        private readonly marketingService: CustomerMarketingService,
        private readonly eventRepository: MarketingEventRepository,
        private readonly productGroupRepository: ProductGroupRepository
    ) {}

    async listProductGroups(
        workspaceId: string
    ): Promise<ICustomerMarketingSignalProductGroup[]> {
        const groups = await this.productGroupRepository.find(
            { workspace: workspaceId },
            { orderBy: { name: 'ASC' } }
        );
        return groups.map(g => ({ id: g.id, name: g.name }));
    }

    /** Returns how many signals were applied; a failed one is skipped. */
    async apply(
        target: ICustomerMarketingSignalTarget,
        signals: ICustomerMarketingSignal[]
    ): Promise<number> {
        const known = signals.filter(s => KIND_ORDER.includes(s.kind));
        known.sort(
            (a, b) => KIND_ORDER.indexOf(a.kind) - KIND_ORDER.indexOf(b.kind)
        );
        let applied = 0;
        for (const signal of known) {
            const message = target.messages[signal.message_index];
            if (!message) continue;
            try {
                if (await this.applyOne(target, signal, message)) applied++;
            } catch (error: unknown) {
                this.logger.warn(
                    `marketing signal ${signal.kind} failed customer=${target.customerId} ` +
                        `message=${message.id}: ${(error as Error).message}`
                );
            }
        }
        return applied;
    }

    private async applyOne(
        target: ICustomerMarketingSignalTarget,
        signal: ICustomerMarketingSignal,
        message: { id: string; dateSent: Date }
    ): Promise<boolean> {
        const { customerId, workspaceId } = target;
        const context: ICustomerMarketingChangeContext = {
            actor: ENUM_MARKETING_EVENT_ACTOR.CLASSIFIER,
            reason: signal.quote,
            conversationId: target.conversationId,
            messageId: message.id,
        };
        const productGroupId = signal.product_group_id ?? null;

        switch (signal.kind) {
            case 'interest':
            case 'asked_price':
                await this.productMarketingService.recordIntent(
                    customerId,
                    workspaceId,
                    {
                        stage:
                            signal.kind === 'asked_price'
                                ? ENUM_CUSTOMER_JOURNEY_STAGE.ASKED_PRICE
                                : ENUM_CUSTOMER_JOURNEY_STAGE.INTERESTED,
                        productGroupId,
                        occurredAt: message.dateSent,
                    },
                    context
                );
                return true;
            case 'later': {
                if (!productGroupId) return false;
                const days = signal.defer_days ?? CUSTOMER_MARKETING_DEFER_DAYS;
                await this.productMarketingService.deferProductGroup(
                    customerId,
                    workspaceId,
                    productGroupId,
                    new Date(message.dateSent.getTime() + days * DAY_MS),
                    context
                );
                return true;
            }
            case 'hostile': {
                // Once per message: an operator who cleared the flag is not
                // overruled by the next re-read of the same conversation.
                const seen = await this.eventRepository.getTotal({
                    customer: customerId,
                    kind: ENUM_MARKETING_EVENT_KIND.HOSTILE,
                    messageId: message.id,
                });
                if (seen > 0) return false;
                await this.marketingService.setHostile(
                    customerId,
                    workspaceId,
                    true,
                    context
                );
                return true;
            }
        }
    }
}
