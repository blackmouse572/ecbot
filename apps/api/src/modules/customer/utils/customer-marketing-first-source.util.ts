import { CustomerMarketingStateEntity } from '../repository/entities/customer-marketing-state.entity';
import { ICustomerMarketingFirstSource } from '../interfaces/customer-marketing.interface';

/**
 * Nguồn đầu tiên from a state whose first tracked link is loaded with its
 * parent and account. A code (QR, KOL, ...) names its source as the parent.
 */
export function customerMarketingFirstSource(
    state: CustomerMarketingStateEntity
): ICustomerMarketingFirstSource | null {
    const link = state.firstTrackedLink;

    if (!link || !state.firstSourceAt) return null;
    const source = link.parent ?? link;

    return {
        sourceId: source.id,
        sourceName: source.name,
        codeName: link.parent ? link.name : null,
        channel: link.account.type,
        at: state.firstSourceAt,
    };
}
