import { CustomerMarketingStateEntity } from '../repository/entities/customer-marketing-state.entity';
import { TrackedLinkEntity } from '../repository/entities/tracked-link.entity';
import { ICustomerMarketingFirstSource } from '../interfaces/customer-marketing.interface';

/**
 * Nguồn đầu tiên from a state whose first tracked link is loaded with its
 * parent and account.
 */
export function customerMarketingFirstSource(
    state: CustomerMarketingStateEntity
): ICustomerMarketingFirstSource | null {
    const link = state.firstTrackedLink;

    if (!link || !state.firstSourceAt) return null;
    return customerMarketingSource(link, state.firstSourceAt);
}

/**
 * A tracked link, loaded with its parent and account, as the source the
 * customer came from. A code (QR, KOL, ...) names its source as the parent.
 */
export function customerMarketingSource(
    link: TrackedLinkEntity,
    at: Date
): ICustomerMarketingFirstSource {
    const source = link.parent ?? link;

    return {
        sourceId: source.id,
        sourceName: source.name,
        codeName: link.parent ? link.name : null,
        channel: link.account.type,
        at,
    };
}
