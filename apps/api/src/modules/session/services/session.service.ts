import { UserEntity } from '@app/modules/user/repository/entities/user.entity';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cache } from 'cache-manager';
import { plainToInstance } from 'class-transformer';
import { Request } from 'express';
import { Duration } from 'luxon';
import {
    IDatabaseCreateOptions,
    IDatabaseDeleteManyOptions,
    IDatabaseFindAllOptions,
    IDatabaseFindOneOptions,
    IDatabaseGetTotalOptions,
    IDatabaseOptions,
    IDatabaseUpdateManyOptions,
} from 'src/common/database/interfaces/database.interface';
import { HelperDateService } from 'src/common/helper/services/helper.date.service';
import { MessageService } from 'src/common/message/services/message.service';
import { ENUM_ACTIVITY_ACTION } from 'src/modules/activity/enums/activity.enum';
import { ActivityService } from 'src/modules/activity/services/activity.service';
import { ENUM_POLICY_SUBJECT } from 'src/modules/policy/enums/policy.enum';
import { SessionCreateRequestDto } from 'src/modules/session/dtos/request/session.create.request.dto';
import { SessionAdminListResponseDto } from 'src/modules/session/dtos/response/session.admin-list.response.dto';
import { SessionListResponseDto } from 'src/modules/session/dtos/response/session.list.response.dto';
import { UserMetaResponseDto } from 'src/modules/user/dtos/response/user.meta.response.dto';
import { ENUM_SESSION_STATUS } from 'src/modules/session/enums/session.enum';
import {
    ImpersonationEndReason,
    ISessionService,
} from 'src/modules/session/interfaces/session.service.interface';
import { SessionEntity } from 'src/modules/session/repository/entities/session.entity';
import { SessionRepository } from 'src/modules/session/repository/repositories/session.repository';

// Minimum gap between lastActiveAt writes for a single session.
const SESSION_ACTIVE_THROTTLE_SECONDS = 60;

@Injectable()
export class SessionService implements ISessionService {
    private readonly refreshTokenExpiration: number;
    private readonly impersonateTokenExpiration: number;
    private readonly appName: string;

    private readonly sessionKeyPrefix: string;
    private readonly logger = new Logger(SessionService.name);

    constructor(
        @Inject(CACHE_MANAGER) private cacheManager: Cache,
        private readonly configService: ConfigService,
        private readonly helperDateService: HelperDateService,
        private readonly sessionRepository: SessionRepository,
        private readonly messageService: MessageService,
        private readonly activityService: ActivityService
    ) {
        this.refreshTokenExpiration = this.configService.get<number>(
            'auth.jwt.refreshToken.expirationTime'
        )!;
        this.impersonateTokenExpiration = this.configService.get<number>(
            'auth.jwt.impersonateToken.expirationTime'
        )!;
        this.appName = this.configService.get<string>('app.name')!;

        this.sessionKeyPrefix =
            this.configService.get<string>('session.keyPrefix')!;
    }

    async findAll(
        find?: Record<string, any>,
        options?: IDatabaseFindAllOptions
    ): Promise<SessionEntity[]> {
        return this.sessionRepository.find<SessionEntity>(find, options);
    }

    async findAllByUser(
        user: string,
        find?: Record<string, any>,
        options?: IDatabaseFindAllOptions
    ): Promise<SessionEntity[]> {
        return this.sessionRepository.find<SessionEntity>(
            { user, ...find },
            options
        );
    }

    async findOneById(
        id: string,
        options?: IDatabaseFindOneOptions
    ): Promise<SessionEntity | null> {
        return this.sessionRepository.findOneById<SessionEntity>(id, options);
    }

    async findOne(
        find: Record<string, any>,
        options?: IDatabaseFindOneOptions
    ): Promise<SessionEntity> {
        return this.sessionRepository.findOne<SessionEntity>(find, options);
    }

    async findOneActiveById(
        id: string,
        options?: IDatabaseFindOneOptions
    ): Promise<SessionEntity> {
        // Filtered by status, not expiredAt: the list endpoint shows a session
        // as ACTIVE until the hourly sweep relabels it, so gating revoke on
        // expiredAt made an already-expired-but-unswept row 404 instead of
        // revoking cleanly.
        return this.sessionRepository.findOne<SessionEntity>(
            {
                id,
                status: ENUM_SESSION_STATUS.ACTIVE,
            },
            options
        );
    }

    async findOneActiveByIdAndUser(
        id: string,
        user: string,
        options?: IDatabaseFindOneOptions
    ): Promise<SessionEntity> {
        return this.sessionRepository.findOne<SessionEntity>(
            {
                id,
                user,
                status: ENUM_SESSION_STATUS.ACTIVE,
            },
            options
        );
    }

    async getTotal(
        find?: Record<string, any>,
        options?: IDatabaseGetTotalOptions
    ): Promise<number> {
        return this.sessionRepository.getTotal(find, options);
    }

    async getTotalByUser(
        user: string,
        options?: IDatabaseGetTotalOptions
    ): Promise<number> {
        return this.sessionRepository.getTotal({ user }, options);
    }

    async create(
        request: Request,
        { user }: SessionCreateRequestDto,
        options?: IDatabaseCreateOptions
    ): Promise<SessionEntity> {
        const today = this.helperDateService.create();
        const expiredAt: Date = this.helperDateService.forward(
            today,
            Duration.fromObject({
                seconds: this.refreshTokenExpiration,
            })
        );

        const create = new SessionEntity();
        create.user = this.sessionRepository
            .getEntityManager()
            .getReference(UserEntity, user);
        create.hostname = request.hostname;
        create.ip = request.ip ?? '0.0.0.0';
        create.protocol = request.protocol;
        create.originalUrl = request.originalUrl;
        create.method = request.method;

        create.userAgent = request.headers['user-agent'] as string;
        create.xForwardedFor = request.headers['x-forwarded-for'] as string;
        create.xForwardedHost = request.headers['x-forwarded-host'] as string;
        create.xForwardedPorto = request.headers['x-forwarded-porto'] as string;

        create.status = ENUM_SESSION_STATUS.ACTIVE;
        create.expiredAt = expiredAt;

        return this.sessionRepository.create<SessionEntity>(create, options);
    }

    async createImpersonation(
        request: Request,
        { user, impersonatedBy }: { user: string; impersonatedBy: string },
        options?: IDatabaseCreateOptions
    ): Promise<SessionEntity> {
        const today = this.helperDateService.create();
        const expiredAt: Date = this.helperDateService.forward(
            today,
            Duration.fromObject({
                seconds: this.impersonateTokenExpiration,
            })
        );

        const create = new SessionEntity();
        create.user = this.sessionRepository
            .getEntityManager()
            .getReference(UserEntity, user);
        create.impersonatedBy = impersonatedBy;
        create.hostname = request.hostname;
        create.ip = request.ip ?? '0.0.0.0';
        create.protocol = request.protocol;
        create.originalUrl = request.originalUrl;
        create.method = request.method;

        create.userAgent = request.headers['user-agent'] as string;
        create.xForwardedFor = request.headers['x-forwarded-for'] as string;
        create.xForwardedHost = request.headers['x-forwarded-host'] as string;
        create.xForwardedPorto = request.headers['x-forwarded-porto'] as string;

        create.status = ENUM_SESSION_STATUS.ACTIVE;
        create.expiredAt = expiredAt;

        return this.sessionRepository.create<SessionEntity>(create, options);
    }

    // Bump lastActiveAt on the current session. Runs on every authenticated
    // request, so it is gated by a short-lived cache key: within the throttle
    // window a cheap cache hit short-circuits before any DB round-trip.
    // Fire-and-forget safe (never throws).
    async touchLastActive(id: string): Promise<void> {
        try {
            const cacheKey = `${this.appName}:${this.sessionKeyPrefix}:active:${id}`;
            if (await this.cacheManager.get(cacheKey)) return;
            await this.cacheManager.set(
                cacheKey,
                1,
                SESSION_ACTIVE_THROTTLE_SECONDS * 1000
            );
            await this.sessionRepository
                .getEntityManager()
                .nativeUpdate(
                    SessionEntity,
                    { id },
                    { lastActiveAt: this.helperDateService.create() }
                );
        } catch (error) {
            this.logger.warn(`touchLastActive failed for ${id}: ${error}`);
        }
    }

    mapList(
        userLogins: SessionEntity[] | SessionEntity[]
    ): SessionListResponseDto[] {
        return plainToInstance(SessionListResponseDto, userLogins);
    }

    // Cross-user admin list. The populated `user` relation is a full UserEntity,
    // so it is narrowed explicitly through UserMetaResponseDto with
    // excludeExtraneousValues — otherwise class-transformer copies every entity
    // property (password/salt) onto the nested DTO and leaks it in the response.
    mapAdminList(
        sessions: SessionEntity[],
        currentSessionId?: string
    ): SessionAdminListResponseDto[] {
        return sessions.map(session => {
            const dto = plainToInstance(SessionAdminListResponseDto, session);
            dto.user = session.user
                ? plainToInstance(UserMetaResponseDto, session.user, {
                      excludeExtraneousValues: true,
                  })
                : (undefined as any);
            // Not on the entity, so plainToInstance can't map it — the admin
            // UI needs this to gate the single-row Revoke action, since
            // revoking your own current session 403s.
            dto.isCurrent =
                !!currentSessionId && session.id === currentSessionId;
            return dto;
        });
    }

    async findLoginSession(id: string): Promise<string> {
        return (await this.cacheManager.get<string>(
            `${this.appName}:${this.sessionKeyPrefix}:${id}`
        ))!;
    }

    async setLoginSession(
        user: UserEntity,
        session: SessionEntity,
        overrideTtlMs?: number
    ): Promise<void> {
        this.logger.debug(`Setting login for user [${user.id}]`);
        const key = `${this.appName}:${this.sessionKeyPrefix}:${session.id}`;

        // refreshTokenExpiration is stored in seconds (auth.config.ts:
        // ms(...) / 1000); cache-manager v6 `set()` takes milliseconds.
        await this.cacheManager.set(
            key,
            { user: user.id },
            overrideTtlMs ?? this.refreshTokenExpiration * 1000
        );

        return;
    }

    async deleteLoginSession(id: string): Promise<void> {
        const key = `${this.appName}:${this.sessionKeyPrefix}:${id}`;
        await this.cacheManager.del(key);
        return;
    }

    async resetLoginSession(): Promise<void> {
        await this.cacheManager.clear();

        return;
    }

    async updateRevoke(
        repository: SessionEntity,
        _options?: IDatabaseOptions
    ): Promise<SessionEntity> {
        await this.deleteLoginSession(repository.id);

        repository.status = ENUM_SESSION_STATUS.REVOKED;
        repository.revokeAt = this.helperDateService.create();
        this.sessionRepository.getEntityManager().persist(repository);
        await this.sessionRepository.getEntityManager().flush();

        // Revoked by the user, an admin or a password change rather than by
        // ending the impersonation: it still has to be audited.
        if (repository.impersonatedBy) {
            await this.auditImpersonationEnd(
                {
                    id: repository.id,
                    user: repository.user.id,
                    impersonatedBy: repository.impersonatedBy,
                },
                'revoked'
            );
        }

        return repository;
    }

    // Best effort: a failed audit write must never block a revoke, which is a
    // security action. Atomic paths (endImpersonation) write inside their own
    // transaction instead.
    private async auditImpersonationEnd(
        session: { id: string; user: string; impersonatedBy: string },
        reason: ImpersonationEndReason,
        options?: IDatabaseCreateOptions
    ): Promise<void> {
        const em = this.sessionRepository.getEntityManager();
        const write = () =>
            this.activityService.createByAdmin(
                em.getReference(UserEntity, session.user),
                session.impersonatedBy,
                {
                    action: ENUM_ACTIVITY_ACTION.IMPERSONATE_END,
                    subject: ENUM_POLICY_SUBJECT.USER,
                    metadata: { session: session.id, reason },
                },
                options
            );
        if (options) {
            await write();
            return;
        }
        try {
            await write();
        } catch (err) {
            this.logger.error(
                `Failed to audit end of impersonation session [${session.id}]: ${(err as Error)?.message}`
            );
        }
    }

    // Atomic ACTIVE -> REVOKED transition for an impersonation session. True
    // only for the caller whose UPDATE actually flipped the row, and the audit
    // row is written in the same transaction, so a session is never revoked
    // without being logged and is never logged twice.
    async endImpersonation(
        id: string,
        reason: ImpersonationEndReason
    ): Promise<boolean> {
        const em = this.sessionRepository.getEntityManager();
        const ended = await em.transactional(async tem => {
            const affected = await tem.nativeUpdate(
                SessionEntity,
                {
                    id,
                    status: ENUM_SESSION_STATUS.ACTIVE,
                    impersonatedBy: { $ne: null },
                },
                {
                    status: ENUM_SESSION_STATUS.REVOKED,
                    revokeAt: this.helperDateService.create(),
                }
            );
            if (affected === 0) return false;

            const row = await tem.findOneOrFail(SessionEntity, { id });
            await this.auditImpersonationEnd(
                {
                    id,
                    user: row.user.id,
                    impersonatedBy: row.impersonatedBy!,
                },
                reason,
                { em: tem }
            );
            return true;
        });
        await this.deleteLoginSession(id);

        return ended;
    }

    // Rolling expiry for an impersonation session: the sweep then finds an
    // abandoned session soon after its last token dies. Conditional on ACTIVE,
    // so false means the session was revoked in the meantime.
    async extendImpersonation(id: string, expiredAt: Date): Promise<boolean> {
        const affected = await this.sessionRepository
            .getEntityManager()
            .nativeUpdate(
                SessionEntity,
                { id, status: ENUM_SESSION_STATUS.ACTIVE },
                { expiredAt }
            );
        return affected > 0;
    }

    async processDeleteLoginSession(session: string): Promise<void> {
        const checkSession = await this.findOneById(session);

        if (!checkSession) {
            throw new Error(
                this.messageService.setMessage('session.error.notFound')
            );
        }

        await this.updateRevoke(checkSession);
    }

    /**
     * Account deletion keeps the session rows but drops the network
     * identifiers. `ip` is NOT NULL, so it gets the unspecified address.
     */
    async anonymizeByUser(
        user: string,
        options?: IDatabaseUpdateManyOptions
    ): Promise<void> {
        await this.sessionRepository.updateManyRaw(
            { user },
            {
                ip: '0.0.0.0',
                userAgent: null,
                xForwardedFor: null,
                xForwardedHost: null,
                country: null,
            },
            options
        );
    }

    /** Revokes every session of the user, or every other one with `exceptSession`. */
    async updateManyRevokeByUser(
        user: string,
        options?: IDatabaseUpdateManyOptions,
        exceptSession?: string
    ): Promise<boolean> {
        const today = this.helperDateService.create();
        const except = exceptSession ? { id: { $ne: exceptSession } } : {};
        const sessions = await this.findAllByUser(user, except, options);
        const promises = sessions.map(e => this.deleteLoginSession(e.id));
        // Impersonation sessions that are about to be flipped by this revoke-all
        // (password change, account deletion, admin "revoke all").
        const impersonated = sessions.filter(
            e => e.status === ENUM_SESSION_STATUS.ACTIVE && e.impersonatedBy
        );

        await Promise.all(promises);

        // Scoped to ACTIVE: without it, a "revoke all" rewrote revokeAt on
        // already-REVOKED rows too, collapsing distinct revoke timestamps into
        // one. The updated rows are the real signal for the return value, not
        // a hardcoded true that reports success even when nothing changed.
        const updated = await this.sessionRepository.updateMany(
            {
                user,
                status: ENUM_SESSION_STATUS.ACTIVE,
                ...except,
            },
            {
                status: ENUM_SESSION_STATUS.REVOKED,
                revokeAt: today,
            },
            options
        );

        for (const e of impersonated) {
            await this.auditImpersonationEnd(
                { id: e.id, user, impersonatedBy: e.impersonatedBy! },
                'revoked'
            );
        }

        return updated.length > 0;
    }

    async deleteMany(
        find?: Record<string, any>,
        options?: IDatabaseDeleteManyOptions
    ): Promise<boolean> {
        await this.sessionRepository.deleteMany(find, options);

        return true;
    }
}
