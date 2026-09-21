import type { INestApplication } from '@nestjs/common';
import { http } from './http';

// Password used by the user seed (migration.user.seed.ts) for every seeded user.
export const SEED_PASSWORD = 'aaAA@123';

// Seeded accounts available after `pnpm --filter api migrate:seed:e2e`.
export const SEED_USERS = {
    superAdmin: 'superadmin@mail.com',
    admin: 'admin@mail.com',
    individual: 'individual@mail.com',
    premium: 'premium@mail.com',
    business: 'business@mail.com',
};

/**
 * Logs in a seeded user and returns their JWT access token.
 * No email round-trip — credentials come straight from the seed.
 */
export async function login(
    app: INestApplication,
    base: string,
    email: string,
    password: string = SEED_PASSWORD
): Promise<string> {
    const res = await http(app)
        .post(`${base}/public/auth/login/credential`)
        // Any non-empty token passes Cloudflare's always-pass test secret;
        // ignored entirely when TURNSTILE_SECRET_KEY is unset.
        .send({ email, password, turnstileToken: 'e2e' });

    if (res.status >= 300) {
        throw new Error(
            `login failed for ${email}: ${res.status} ${JSON.stringify(res.body)}`
        );
    }

    return res.body.data.accessToken;
}

export function authHeader(token: string): [string, string] {
    return ['Authorization', `Bearer ${token}`];
}
