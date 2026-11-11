import { DatabaseRepository } from '@app/common/database/bases/database.repository';
import { EntityManager, QBFilterQuery } from '@mikro-orm/postgresql';
import { Injectable } from '@nestjs/common';
import { CUSTOMER_MARKETING_DORMANT_DAYS } from '../../constants/customer-marketing.constant';
import {
    ENUM_CUSTOMER_JOURNEY_STAGE,
    ENUM_CUSTOMER_MARKETING_PERMISSION,
} from '../../enums/customer-marketing.enum';
import { ICustomerMarketingListFilter } from '../../interfaces/customer-marketing.interface';
import { ITrackedLinkStats } from '../../interfaces/tracked-link.interface';
import { CustomerMarketingStateEntity } from '../entities/customer-marketing-state.entity';

const DAY_MS = 86_400_000;

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

    /**
     * A `find` fragment on customers for the list filters. A customer with no
     * row yet counts as Mới biết and Chưa đồng ý, and is never Ngủ đông. The
     * sub-queries are plain values, so one fragment serves both the page and
     * the count query.
     */
    customerListFilter(
        filter: ICustomerMarketingListFilter
    ): Record<string, any> {
        const conditions: Record<string, any>[] = [];
        if (filter.stages?.length) {
            conditions.push(
                this.withMissing(
                    { stage: { $in: filter.stages } },
                    filter.stages.includes(ENUM_CUSTOMER_JOURNEY_STAGE.NEW)
                )
            );
        }
        if (filter.permissions?.length) {
            conditions.push(
                this.withMissing(
                    { permission: { $in: filter.permissions } },
                    filter.permissions.includes(
                        ENUM_CUSTOMER_MARKETING_PERMISSION.PENDING
                    )
                )
            );
        }
        if (filter.dormant !== undefined) {
            // No message and no order since the cutoff, and at least one of them.
            const cutoff = new Date(
                Date.now() - CUSTOMER_MARKETING_DORMANT_DAYS * DAY_MS
            );
            const dormantIds = this.customerIds({
                $and: [
                    {
                        $or: [
                            { lastInboundAt: { $lt: cutoff } },
                            { lastInboundAt: null },
                        ],
                    },
                    {
                        $or: [
                            { lastOrderAt: { $lt: cutoff } },
                            { lastOrderAt: null },
                        ],
                    },
                    {
                        $or: [
                            { lastInboundAt: { $ne: null } },
                            { lastOrderAt: { $ne: null } },
                        ],
                    },
                ],
            });
            conditions.push({
                id: filter.dormant ? { $in: dormantIds } : { $nin: dormantIds },
            });
        }
        return conditions.length ? { $and: conditions } : {};
    }

    /** Customers whose row matches, plus those without a row when the default matches. */
    private withMissing(
        where: QBFilterQuery<CustomerMarketingStateEntity>,
        includeMissing: boolean
    ): Record<string, any> {
        const matching = { id: { $in: this.customerIds(where) } };
        return includeMissing
            ? { $or: [matching, { id: { $nin: this.customerIds({}) } }] }
            : matching;
    }

    private customerIds(where: QBFilterQuery<CustomerMarketingStateEntity>) {
        return this.em
            .createQueryBuilder(CustomerMarketingStateEntity, 's')
            .select('s.customer')
            .where(where)
            .getKnexQuery();
    }
}

const POTENTIAL_STAGES = [
    ENUM_CUSTOMER_JOURNEY_STAGE.ASKED_PRICE,
    ENUM_CUSTOMER_JOURNEY_STAGE.BOUGHT_ONCE,
    ENUM_CUSTOMER_JOURNEY_STAGE.BOUGHT_REPEAT,
];
