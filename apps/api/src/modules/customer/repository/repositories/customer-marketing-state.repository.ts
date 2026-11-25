import { DatabaseRepository } from '@app/common/database/bases/database.repository';
import { EntityManager, QBFilterQuery } from '@mikro-orm/postgresql';
import { Injectable } from '@nestjs/common';
import { CUSTOMER_MARKETING_DORMANT_DAYS } from '../../constants/customer-marketing.constant';
import {
    ENUM_CUSTOMER_JOURNEY_STAGE,
    ENUM_CUSTOMER_MARKETING_PERMISSION,
    ENUM_MARKETING_EVENT_KIND,
} from '../../enums/customer-marketing.enum';
import { ICustomerMarketingListFilter } from '../../interfaces/customer-marketing.interface';
import { ITrackedLinkStats } from '../../interfaces/tracked-link.interface';
import { CustomerMarketingStateEntity } from '../entities/customer-marketing-state.entity';
import { CustomerTableName } from '../entities/customer.entity';
import { MarketingEventTableName } from '../entities/marketing-event.entity';
import { TrackedLinkTableName } from '../entities/tracked-link.entity';

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

    /**
     * Nguồn khách counts per tracked link. Khách mới: the link was the
     * customer's first source. Khách quay lại: an earlier customer who later
     * arrived through it. Each confirmed order counts once, for the last link
     * the customer arrived through before it. Merged-away customers count
     * under the customer they were merged into.
     */
    async statsBySource(
        workspaceId: string,
        linkIds: string[]
    ): Promise<(ITrackedLinkStats & { linkId: string })[]> {
        if (!linkIds.length) return [];
        const rows: {
            link_id: string;
            new_customers: string | number;
            returning_customers: string | number;
            potential_customers: string | number;
            orders: string | number;
        }[] = await this.em.getConnection().execute(
            `
            WITH arrivals AS (
                SELECT COALESCE(c.merged_into_customer_id, c.id) AS customer_id,
                    e.tracked_link_id AS link_id,
                    e.created_at AS at
                FROM marketing_events e
                JOIN customers c ON c.id = e.customer_id
                WHERE e.workspace_id = ?
                    AND e.kind = 'SOURCE'
                    AND e.tracked_link_id IS NOT NULL
            ),
            members AS (
                SELECT DISTINCT a.link_id, a.customer_id,
                    s.first_tracked_link_id = a.link_id AS is_new,
                    s.stage IN (?) AS potential
                FROM arrivals a
                JOIN customers c ON c.id = a.customer_id
                JOIN customer_marketing_states s ON s.customer_id = a.customer_id
                WHERE a.link_id IN (?)
                    AND s.deleted_at IS NULL
                    AND c.deleted_at IS NULL
                    AND c.merged_into_customer_id IS NULL
            ),
            last_touch AS (
                SELECT (
                    SELECT a.link_id FROM arrivals a
                    WHERE a.customer_id = o.customer_id
                        AND a.at <= o.ordered_at
                    ORDER BY a.at DESC
                    LIMIT 1
                ) AS link_id
                FROM orders o
                WHERE o.customer_id IN (SELECT customer_id FROM members)
                    AND o.status = 'CONFIRMED'
                    AND o.deleted_at IS NULL
            ),
            per_link AS (
                SELECT link_id,
                    COUNT(*) FILTER (WHERE is_new) AS new_customers,
                    COUNT(*) FILTER (WHERE NOT is_new) AS returning_customers,
                    COUNT(*) FILTER (WHERE potential) AS potential_customers
                FROM members
                GROUP BY link_id
            )
            SELECT p.link_id, p.new_customers, p.returning_customers,
                p.potential_customers, COALESCE(t.orders, 0) AS orders
            FROM per_link p
            LEFT JOIN (
                SELECT link_id, COUNT(*) AS orders FROM last_touch GROUP BY link_id
            ) t ON t.link_id = p.link_id
            `,
            [workspaceId, POTENTIAL_STAGES, linkIds]
        );
        return rows.map(row => ({
            linkId: row.link_id,
            newCustomers: Number(row.new_customers),
            returningCustomers: Number(row.returning_customers),
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

        if (filter.sourceId) {
            conditions.push({
                id: { $in: this.arrivedThrough(filter.sourceId) },
            });
        }

        return conditions.length ? { $and: conditions } : {};
    }

    /** Loads Nguồn đầu tiên: the link, its source and its channel. */
    async populateFirstSource(
        states: CustomerMarketingStateEntity[]
    ): Promise<void> {
        const withSource = states.filter(s => s.firstTrackedLink);

        if (withSource.length === 0) return;
        await this.em.populate(withSource, [
            'firstTrackedLink.parent',
            'firstTrackedLink.account',
        ]);
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

    /**
     * Customers who ever arrived through a source or one of its codes, not
     * only first. A merged-away customer counts as the one it went into.
     */
    private arrivedThrough(sourceId: string) {
        const knex = this.em.getKnex();
        const links = knex(TrackedLinkTableName)
            .select('id')
            .where('id', sourceId)
            .orWhere('parent_id', sourceId);
        return knex(`${MarketingEventTableName} as e`)
            .join(`${CustomerTableName} as c`, 'c.id', 'e.customer_id')
            .where('e.kind', ENUM_MARKETING_EVENT_KIND.SOURCE)
            .whereIn('e.tracked_link_id', links)
            .select(knex.raw('COALESCE(c.merged_into_customer_id, c.id)'));
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
