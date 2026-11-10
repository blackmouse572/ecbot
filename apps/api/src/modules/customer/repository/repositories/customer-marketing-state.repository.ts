import { DatabaseRepository } from '@app/common/database/bases/database.repository';
import { EntityManager } from '@mikro-orm/postgresql';
import { Injectable } from '@nestjs/common';
import { ENUM_CUSTOMER_JOURNEY_STAGE } from '../../enums/customer-marketing.enum';
import { ITrackedLinkStats } from '../../interfaces/tracked-link.interface';
import { CustomerMarketingStateEntity } from '../entities/customer-marketing-state.entity';

@Injectable()
export class CustomerMarketingStateRepository extends DatabaseRepository<CustomerMarketingStateEntity> {
    constructor(em: EntityManager) {
        super(em, CustomerMarketingStateEntity);
    }

    findByCustomer(
        customerId: string,
        em?: EntityManager
    ): Promise<CustomerMarketingStateEntity | null> {
        return (em ?? this.em).findOne(CustomerMarketingStateEntity, {
            customer: customerId,
        });
    }

    /** Counts per tracked link, by each customer's first source. Merged-away
     *  customers count once, under the customer they were merged into. */
    async statsByFirstSource(
        workspaceId: string,
        linkIds: string[]
    ): Promise<(ITrackedLinkStats & { linkId: string })[]> {
        if (!linkIds.length) return [];
        const rows: {
            link_id: string;
            new_customers: string | number;
            potential_customers: string | number;
            orders: string | number;
        }[] = await this.em.getConnection().execute(
            `
            SELECT s.first_tracked_link_id AS link_id,
                COUNT(*) AS new_customers,
                COUNT(*) FILTER (WHERE s.stage IN (?)) AS potential_customers,
                COALESCE(SUM(o.orders), 0) AS orders
            FROM customer_marketing_states s
            JOIN customers c ON c.id = s.customer_id
            LEFT JOIN LATERAL (
                SELECT COUNT(*) AS orders
                FROM orders o
                WHERE o.customer_id = s.customer_id
                    AND o.status = 'CONFIRMED'
                    AND o.deleted_at IS NULL
                    AND o.ordered_at >= s.first_source_at
            ) o ON TRUE
            WHERE s.workspace_id = ?
                AND s.first_tracked_link_id IN (?)
                AND s.deleted_at IS NULL
                AND c.deleted_at IS NULL
                AND c.merged_into_customer_id IS NULL
            GROUP BY s.first_tracked_link_id
            `,
            [POTENTIAL_STAGES, workspaceId, linkIds]
        );
        return rows.map(row => ({
            linkId: row.link_id,
            newCustomers: Number(row.new_customers),
            potentialCustomers: Number(row.potential_customers),
            orders: Number(row.orders),
        }));
    }
}

const POTENTIAL_STAGES = [
    ENUM_CUSTOMER_JOURNEY_STAGE.ASKED_PRICE,
    ENUM_CUSTOMER_JOURNEY_STAGE.BOUGHT_ONCE,
    ENUM_CUSTOMER_JOURNEY_STAGE.BOUGHT_REPEAT,
];
