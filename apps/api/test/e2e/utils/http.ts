import type { INestApplication } from '@nestjs/common';
import request from 'supertest';

// Seeded DEFAULT api key as `key:secret`, which the x-api-key guard expects on
// every protected route (login included). It comes from the environment: the
// e2e workflow generates it and pins the seeder to it (E2E_SEED_DEFAULT_API_KEY);
// locally it is E2E_API_KEY in apps/api/.env. Never hardcode a key here.
export function defaultApiKey(): string {
    const key = process.env.E2E_API_KEY;
    if (!key) {
        throw new Error(
            'E2E_API_KEY is not set: the e2e http helper cannot authenticate'
        );
    }
    return key;
}

/**
 * A supertest facade bound to the app that presets the x-api-key header on
 * every verb, so specs never repeat it. Chain `.set(...)`, `.send(...)`, etc.
 * as usual.
 */
export function http(app: INestApplication) {
    const server = app.getHttpServer();
    const withKey = (t: request.Test) => t.set('x-api-key', defaultApiKey());
    return {
        get: (url: string) => withKey(request(server).get(url)),
        post: (url: string) => withKey(request(server).post(url)),
        put: (url: string) => withKey(request(server).put(url)),
        patch: (url: string) => withKey(request(server).patch(url)),
        delete: (url: string) => withKey(request(server).delete(url)),
    };
}
