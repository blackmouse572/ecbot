import { DatabaseRepository } from '@app/common/database/bases/database.repository';
import { EntityManager, QBFilterQuery } from '@mikro-orm/postgresql';
import { Injectable } from '@nestjs/common';
import { CUSTOMER_MARKETING_DORMANT_DAYS } from '../../constants/customer-marketing.constant';
import {
    ENUM_CUSTOMER_JOURNEY_STAGE,
    ENUM_CUSTOMER_MARKETING_PERMISSION,
} from '../../enums/customer-marketing.enum';
import { ICustomerMarketingListFilter } from '../../interfaces/customer-marketing.interface';
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
            const dormantIds = this.customerIds({
                lastInboundAt: {
                    $lt: new Date(
                        Date.now() - CUSTOMER_MARKETING_DORMANT_DAYS * DAY_MS
                    ),
                },
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
