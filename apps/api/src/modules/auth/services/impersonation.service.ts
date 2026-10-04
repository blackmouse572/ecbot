import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cache } from 'cache-manager';
import { randomBytes } from 'crypto';

export interface IImpersonationHandoff {
    tokenType: string;
    roleType: string;
    accessToken: string;
    expiresIn: number;
    impersonatedBy: string;
    session: string;
    target: { id: string; name: string; email: string };
}

// Single-use, short-lived hand-off so the raw JWT is never put in a URL.
const IMPERSONATION_CODE_TTL_MS = 60_000;

@Injectable()
export class ImpersonationService {
    private readonly appName: string;
    // cache-manager (Keyv) has no atomic get-and-delete, so concurrent
    // exchanges of one code are serialised in-process: only the first caller
    // to claim the key may read it, every concurrent one gets null.
    private readonly claiming = new Set<string>();

    constructor(
        @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
        private readonly configService: ConfigService
    ) {
        this.appName = this.configService.get<string>('app.name')!;
    }

    private key(code: string): string {
        return `${this.appName}:impersonation:code:${code}`;
    }

    async issue(value: IImpersonationHandoff): Promise<string> {
        const code = randomBytes(32).toString('base64url');
        await this.cacheManager.set(
            this.key(code),
            value,
            IMPERSONATION_CODE_TTL_MS
        );
        return code;
    }

    async consume(code: string): Promise<IImpersonationHandoff | null> {
        const key = this.key(code);
        if (this.claiming.has(key)) return null;
        this.claiming.add(key);
        try {
            const value =
                await this.cacheManager.get<IImpersonationHandoff>(key);
            if (!value) return null;
            await this.cacheManager.del(key);
            return value;
        } finally {
            this.claiming.delete(key);
        }
    }
}
