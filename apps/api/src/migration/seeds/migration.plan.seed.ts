import { EntityManager } from '@mikro-orm/postgresql';
import { Injectable } from '@nestjs/common';
import { Command } from 'nestjs-command';
import {
    ENUM_BILLING_CYCLE,
    ENUM_CURRENCY,
} from 'src/modules/billing/enums/plan.enum';
import { PlanEntity } from 'src/modules/billing/repository/entities/plan.entity';

/**
 * Seeds the billing catalog for a fresh database.
 *
 * Only the bootstrap tier lives here. It is the plan every workspace falls back
 * to, so the product does not work without it — whereas paid tiers carry real
 * prices and are an admin's decision, not something to invent in a seed.
 *
 * Kept deliberately in step with the `free` row that migration
 * `20260913000000_create_billing_and_token_usage` inserts: the migration exists
 * for databases that predate billing, this seed for databases created after it.
 * Both are idempotent on `slug`, so running them in either order converges on
 * the same single row.
 */
@Injectable()
export class MigrationPlanSeed {
    constructor(private readonly em: EntityManager) {}

    @Command({
        command: 'seed:plan',
        describe: 'seed billing plans',
    })
    async seeds(): Promise<void> {
        const data: Partial<PlanEntity>[] = [
            {
                name: 'Free',
                slug: 'free',
                description:
                    'Bootstrap plan assigned to workspaces that predate billing.',
                tokenQuota: 1_000_000,
                billingCycle: ENUM_BILLING_CYCLE.MONTHLY,
                price: 0,
                currency: ENUM_CURRENCY.VND,
                isActive: true,
                // Not listed publicly: it is the fallback tier, not something
                // to advertise on the pricing page.
                isPublic: false,
                // Protected — PlanService.archive refuses to retire it.
                isSystem: true,
                sortOrder: 0,
            },
        ];

        // Fork for a request-scoped context (global EM is disallowed — see
        // DatabaseOptionService.allowGlobalContext=false).
        const em = this.em.fork();
        for (const planData of data) {
            const existing = await em.findOne(PlanEntity, {
                slug: planData.slug,
            });
            if (existing) continue;
            em.persist(em.create(PlanEntity, planData as PlanEntity));
        }

        await em.flush();
    }

    async remove(): Promise<void> {
        // System plans are excluded: workspaces reference them, and dropping
        // one would leave every subscription pointing at nothing.
        await this.em.nativeDelete(PlanEntity, { isSystem: false });
    }
}
