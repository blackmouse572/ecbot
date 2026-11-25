import { DatabaseRepository } from '@app/common/database/bases/database.repository';
import { EntityManager } from '@mikro-orm/postgresql';
import { Injectable } from '@nestjs/common';
import { ICustomerMarketingArrivalAt } from '../../interfaces/customer-marketing.interface';
import { MarketingEventEntity } from '../entities/marketing-event.entity';
import { TrackedLinkEntity } from '../entities/tracked-link.entity';

@Injectable()
export class MarketingEventRepository extends DatabaseRepository<MarketingEventEntity> {
    constructor(em: EntityManager) {
        super(em, MarketingEventEntity);
    }

    /**
     * Each tracked link a customer arrived through, with the first time,
     * oldest first. Arrivals of customers merged into it count too.
     */
    async findArrivals(
        customerId: string,
        workspaceId: string
    ): Promise<ICustomerMarketingArrivalAt[]> {
        const rows: { tracked_link_id: string; at: Date }[] = await this.em
            .getConnection()
            .execute(
                `
                SELECT e.tracked_link_id, MIN(e.created_at) AS at
                FROM marketing_events e
                JOIN customers c ON c.id = e.customer_id
                WHERE (c.id = ? OR c.merged_into_customer_id = ?)
                    AND e.workspace_id = ?
                    AND e.kind = 'SOURCE'
                    AND e.tracked_link_id IS NOT NULL
                GROUP BY e.tracked_link_id
                ORDER BY at ASC
                `,
                [customerId, customerId, workspaceId]
            );
        const links = await this.findLinks(rows.map(r => r.tracked_link_id));
        return rows.flatMap(row => {
            const link = links.get(row.tracked_link_id);
            return link ? [{ link, at: new Date(row.at) }] : [];
        });
    }

    /**
     * Live tracked links by id, with the parent and account a source name
     * needs. A deleted link is left out, so it names nothing and opens no page.
     */
    async findLinks(ids: string[]): Promise<Map<string, TrackedLinkEntity>> {
        if (!ids.length) return new Map();
        const links = await this.em.find(
            TrackedLinkEntity,
            { id: { $in: [...new Set(ids)] }, deletedAt: null },
            { populate: ['parent', 'account'] }
        );
        return new Map(links.map(link => [link.id, link]));
    }
}
