import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cache } from 'cache-manager';
import { randomBytes } from 'crypto';
import { ENUM_AUTH_STATUS_CODE_ERROR } from 'src/modules/auth/enums/auth.status-code.enum';
import { IAuthJwtAccessTokenPayload } from 'src/modules/auth/interfaces/auth.interface';
import { AuthService } from 'src/modules/auth/services/auth.service';
import { ENUM_POLICY_ROLE_TYPE } from 'src/modules/policy/enums/policy.enum';
import { ENUM_SESSION_STATUS_CODE_ERROR } from 'src/modules/session/enums/session.status-code.enum';
import { SessionEntity } from 'src/modules/session/repository/entities/session.entity';
import { SessionService } from 'src/modules/session/services/session.service';
import { ENUM_USER_STATUS } from 'src/modules/user/enums/user.enum';
import { ENUM_USER_STATUS_CODE_ERROR } from 'src/modules/user/enums/user.status-code.enum';
import { UserService } from 'src/modules/user/services/user.service';

export interface IImpersonationHandoff {
    tokenType: string;
    roleType: string;
    accessToken: string;
    expiresIn: number;
    // Absolute token expiry (ms epoch). The token is minted at click time but
    // exchanged later, so clients need the remaining lifetime, not the full one.
    expiresAt?: number;
    // Absolute end of the whole session (ms epoch): renewal stops here.
    sessionEndsAt?: number;
    impersonatedBy: string;
    session: string;
    target: { id: string; name: string; email: string };
}

export interface IImpersonationRenewal {
    issued: ReturnType<AuthService['createImpersonationToken']>;
    sessionEndsAt: number;
}

// Single-use, short-lived hand-off so the raw JWT is never put in a URL.
const IMPERSONATION_CODE_TTL_MS = 60_000;
// The nonce key outlives its token a little so a renewal that arrives right at
// expiry is rejected for the right reason rather than racing key expiry.
const NONCE_TTL_SLACK_MS = 60_000;
// Within this of the cap the session is over: a final renewal is refused (and
// audited) instead of minting a token that dies a moment later.
const SESSION_END_GRACE_MS = 2_000;

@Injectable()
export class ImpersonationService {
    private readonly appName: string;
    private readonly sessionCapMs: number;
    // cache-manager (Keyv) has no atomic get-and-delete or compare-and-set, so
    // concurrent exchanges of one code, and concurrent renewals of one session,
    // are serialised in-process: only the first caller proceeds.
    private readonly claiming = new Set<string>();

    constructor(
        @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
        private readonly configService: ConfigService,
        private readonly sessionService: SessionService,
        private readonly userService: UserService,
        private readonly authService: AuthService
    ) {
        this.appName = this.configService.get<string>('app.name')!;
        this.sessionCapMs =
            this.configService.get<number>(
                'auth.jwt.impersonateSession.expirationTime'
            )! * 1000;
    }

    private key(code: string): string {
        return `${this.appName}:impersonation:code:${code}`;
    }

    private nonceKey(session: string): string {
        return `${this.appName}:impersonation:nonce:${session}`;
    }

    /** Absolute end of a session created at `createdAt` (ms epoch). */
    sessionEndsAt(createdAt: Date): number {
        return createdAt.getTime() + this.sessionCapMs;
    }

    /** Seconds the handed-off token still has left, never negative. */
    static remainingSeconds(
        value: Pick<IImpersonationHandoff, 'expiresIn' | 'expiresAt'>,
        now: number = Date.now()
    ): number {
        if (value.expiresAt === undefined) return value.expiresIn;
        return Math.max(0, Math.floor((value.expiresAt - now) / 1000));
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

    /** Random value identifying the newest token of a session. */
    newNonce(): string {
        return randomBytes(16).toString('base64url');
    }

    async storeNonce(
        session: string,
        nonce: string,
        tokenTtlMs: number
    ): Promise<void> {
        await this.cacheManager.set(
            this.nonceKey(session),
            nonce,
            tokenTtlMs + NONCE_TTL_SLACK_MS + IMPERSONATION_CODE_TTL_MS
        );
    }

    private unauthorized(
        statusCode: number,
        message: string
    ): UnauthorizedException {
        return new UnauthorizedException({ statusCode, message });
    }

    /**
     * Sliding renewal of an impersonation access token. Everything that made
     * the session legitimate is re-checked, because a renewal can happen hours
     * after the code was issued: the session must still be ACTIVE and inside its
     * absolute cap, the token must be the newest one issued, the target must
     * still be an active plain user, and the acting admin must still be an
     * active admin. Any failure other than a superseded token ends the session
     * (and audits it).
     */
    async renew({
        user,
        session,
        impersonatedBy,
        impersonationNonce,
    }: Pick<
        IAuthJwtAccessTokenPayload,
        'user' | 'session' | 'impersonatedBy' | 'impersonationNonce'
    >): Promise<IImpersonationRenewal> {
        const notFound = () =>
            this.unauthorized(
                ENUM_SESSION_STATUS_CODE_ERROR.NOT_FOUND,
                'session.error.notFound'
            );
        const expired = () =>
            this.unauthorized(
                ENUM_SESSION_STATUS_CODE_ERROR.EXPIRED,
                'session.error.expired'
            );

        const lockKey = this.nonceKey(session);
        if (this.claiming.has(lockKey)) {
            throw this.unauthorized(
                ENUM_AUTH_STATUS_CODE_ERROR.JWT_ACCESS_TOKEN,
                'auth.error.accessTokenUnauthorized'
            );
        }
        this.claiming.add(lockKey);
        try {
            const row: SessionEntity | null =
                await this.sessionService.findOneActiveByIdAndUser(
                    session,
                    user
                );
            if (
                !row ||
                !impersonatedBy ||
                row.impersonatedBy !== impersonatedBy
            ) {
                throw notFound();
            }

            const sessionEndsAt = this.sessionEndsAt(row.createdAt);
            const remainingMs = sessionEndsAt - Date.now();
            if (remainingMs <= SESSION_END_GRACE_MS) {
                await this.sessionService.endImpersonation(session, 'expired');
                throw expired();
            }

            // Only the newest token may renew. A superseded token is refused
            // without touching the session: it may be a leaked copy, and
            // killing the operator's session over it would be a free DoS.
            const current = await this.cacheManager.get<string>(lockKey);
            if (!impersonationNonce || current !== impersonationNonce) {
                throw this.unauthorized(
                    ENUM_AUTH_STATUS_CODE_ERROR.JWT_ACCESS_TOKEN,
                    'auth.error.accessTokenUnauthorized'
                );
            }

            const [target, admin] = await Promise.all([
                this.userService.findOneById(user, { populate: ['role'] }),
                this.userService.findOneById(impersonatedBy, {
                    populate: ['role'],
                }),
            ]);
            const eligible =
                !!target &&
                target.status === ENUM_USER_STATUS.ACTIVE &&
                target.role.type === ENUM_POLICY_ROLE_TYPE.USER &&
                !!admin &&
                admin.status === ENUM_USER_STATUS.ACTIVE &&
                [
                    ENUM_POLICY_ROLE_TYPE.ADMIN,
                    ENUM_POLICY_ROLE_TYPE.SUPER_ADMIN,
                ].includes(admin.role.type);
            if (!eligible) {
                await this.sessionService.endImpersonation(
                    session,
                    'ineligible'
                );
                throw this.unauthorized(
                    ENUM_USER_STATUS_CODE_ERROR.NOT_FOUND,
                    'user.error.notFound'
                );
            }

            const nextNonce = this.newNonce();
            const issued = this.authService.createImpersonationToken(
                target,
                session,
                impersonatedBy,
                nextNonce,
                Math.floor(remainingMs / 1000)
            );
            const ttlMs = issued.expiresIn * 1000;

            // Rolling expiry so the hourly sweep finds abandoned sessions soon
            // after their last token dies. Conditional on ACTIVE: false means
            // the session was revoked while we were working.
            const extended = await this.sessionService.extendImpersonation(
                session,
                new Date(Date.now() + ttlMs)
            );
            if (!extended) throw notFound();

            await this.sessionService.setLoginSession(target, row, ttlMs);
            await this.storeNonce(session, nextNonce, ttlMs);

            // A revoke can land between the status read above and these key
            // writes, and the writes would bring access back for a REVOKED row.
            // Re-check and undo.
            const stillActive =
                await this.sessionService.findOneActiveById(session);
            if (!stillActive) {
                await this.sessionService.deleteLoginSession(session);
                await this.cacheManager.del(lockKey);
                throw notFound();
            }

            return { issued, sessionEndsAt };
        } finally {
            this.claiming.delete(lockKey);
        }
    }
}
