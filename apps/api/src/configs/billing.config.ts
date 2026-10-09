import { registerAs } from '@nestjs/config';

export default registerAs('billing', (): Record<string, any> => ({
    /**
     * Providers whose catalog a plan edit should be pushed to. Empty (the
     * default) keeps plans local — useful for dev and for self-hosters who
     * do not bill at all.
     */
    syncProviders: (process.env.BILLING_SYNC_PROVIDERS ?? '')
        .split(',')
        .map(p => p.trim().toUpperCase())
        .filter(Boolean),
    stripe: {
        secretKey: process.env.STRIPE_SECRET_KEY,
    },
    /** Quota granted to the bootstrap `free` plan, in tokens. */
    freePlanTokenQuota: Number(
        process.env.BILLING_FREE_PLAN_TOKEN_QUOTA ?? 1_000_000
    ),
    /** Default low-balance warning point, as a percent of the period quota. */
    defaultLowBalanceThreshold: Number(
        process.env.BILLING_LOW_BALANCE_THRESHOLD ?? 20
    ),
}));
