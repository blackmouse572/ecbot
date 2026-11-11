import { Injectable, Logger } from '@nestjs/common';
import { ENUM_CUSTOMER_MARKETING_PERMISSION } from '../enums/customer-marketing.enum';
import { ENUM_CUSTOMER_TAG_EVENT_ACTOR } from '../enums/customer-tag.enum';
import { ENUM_TRACKED_LINK_STATUS } from '../enums/tracked-link.enum';
import { ITrackedLinkArrival } from '../interfaces/tracked-link.interface';
import { CustomerMarketingStateEntity } from '../repository/entities/customer-marketing-state.entity';
import { TrackedLinkRepository } from '../repository/repositories/tracked-link.repository';
import { CustomerMarketingService } from './customer-marketing.service';
import { CustomerTagAssignmentService } from './customer-tag-assignment.service';

/**
 * Turns a tracked link code read on an inbound message into the customer's
 * source. A QR or KOL code is logged as itself and uses its source's
 * settings (greeting, tags, offer).
 */
@Injectable()
export class TrackedLinkAttributionService {
    private readonly logger = new Logger(TrackedLinkAttributionService.name);

    constructor(
        private readonly trackedLinkRepository: TrackedLinkRepository,
        private readonly marketing: CustomerMarketingService,
        private readonly tags: CustomerTagAssignmentService
    ) {}

    /** Null when the code is not a live link of this workspace, or this visit
     *  was already logged; otherwise the greeting the agent should send. */
    async recordArrival(
        input: ITrackedLinkArrival
    ): Promise<{ greeting: string | null } | null> {
        const link = await this.trackedLinkRepository.findOne(
            { workspace: input.workspaceId, code: input.code, deletedAt: null },
            { populate: ['parent'] }
        );
        const source = link?.parent ?? link;
        if (
            !link ||
            !source ||
            link.status !== ENUM_TRACKED_LINK_STATUS.ACTIVE ||
            source.status !== ENUM_TRACKED_LINK_STATUS.ACTIVE
        ) {
            return null;
        }

        const state = await this.marketing.recordSource({
            customerId: input.customerId,
            workspaceId: input.workspaceId,
            trackedLinkId: link.id,
            promisesOffer: source.promisesOffer,
            conversationId: input.conversationId,
            messageId: input.messageId,
        });
        if (!state) return null;

        for (const tagId of source.tagIds) {
            await this.tags
                .apply(input.customerId, tagId, input.workspaceId, {
                    actor: ENUM_CUSTOMER_TAG_EVENT_ACTOR.BOT,
                    conversationId: input.conversationId,
                })
                .catch((error: Error) =>
                    this.logger.warn(
                        `Source tag ${tagId} not applied to ${input.customerId}: ${error.message}`
                    )
                );
        }

        // The greeting is offer copy: a customer who stopped or paused offers
        // does not get it, and the agent answers them as usual.
        const greeting = offersHeld(state) ? null : source.greeting?.trim();
        return { greeting: greeting || null };
    }
}

function offersHeld(state: CustomerMarketingStateEntity): boolean {
    if (state.permission === ENUM_CUSTOMER_MARKETING_PERMISSION.STOPPED)
        return true;
    return (
        state.permission === ENUM_CUSTOMER_MARKETING_PERMISSION.PAUSED &&
        (!state.permissionUntil || state.permissionUntil > new Date())
    );
}
