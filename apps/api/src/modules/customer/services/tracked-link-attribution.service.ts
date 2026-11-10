import { Injectable, Logger } from '@nestjs/common';
import { ENUM_CUSTOMER_TAG_EVENT_ACTOR } from '../enums/customer-tag.enum';
import { ENUM_TRACKED_LINK_STATUS } from '../enums/tracked-link.enum';
import { ITrackedLinkArrival } from '../interfaces/tracked-link.interface';
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

        const recorded = await this.marketing.recordSource({
            customerId: input.customerId,
            workspaceId: input.workspaceId,
            trackedLinkId: link.id,
            promisesOffer: source.promisesOffer,
            conversationId: input.conversationId,
            messageId: input.messageId,
        });
        if (!recorded) return null;

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

        return { greeting: source.greeting?.trim() || null };
    }
}
