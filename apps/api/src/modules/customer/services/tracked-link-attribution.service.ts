import { ENUM_FEATURE_FLAG } from '@app/modules/feature-flag/enums/feature-flag.enum';
import { FeatureFlagService } from '@app/modules/feature-flag/services/feature-flag.service';
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
        private readonly tags: CustomerTagAssignmentService,
        private readonly featureFlagService: FeatureFlagService
    ) {}

    /** True when the code is a live link of this workspace and customer
     *  sources are on: the arrival is worth recording a visitor for. */
    async isLive(workspaceId: string, code: string): Promise<boolean> {
        return !!(await this.findLiveLink(workspaceId, code));
    }

    private async findLiveLink(workspaceId: string, code: string) {
        const enabled = await this.featureFlagService.isEnabled(
            ENUM_FEATURE_FLAG.CUSTOMER_SOURCES,
            workspaceId
        );
        if (!enabled) return null;

        const link = await this.trackedLinkRepository.findOne(
            { workspace: workspaceId, code, deletedAt: null },
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
        return link;
    }

    /** Null when customer sources are off, the code is not a live link of
     *  this workspace, or this visit was already logged; otherwise the
     *  greeting the agent should send. */
    async recordArrival(
        input: ITrackedLinkArrival
    ): Promise<{ greeting: string | null } | null> {
        const link = await this.findLiveLink(input.workspaceId, input.code);
        if (!link) return null;
        const source = link.parent ?? link;

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
