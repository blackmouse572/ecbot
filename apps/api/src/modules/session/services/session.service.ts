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
import { SessionCreateRequestDto } from 'src/modules/session/dtos/request/session.create.request.dto';
import { SessionAdminListResponseDto } from 'src/modules/session/dtos/response/session.admin-list.response.dto';
import { SessionListResponseDto } from 'src/modules/session/dtos/response/session.list.response.dto';
import { UserMetaResponseDto } from 'src/modules/user/dtos/response/user.meta.response.dto';
import { ENUM_SESSION_STATUS } from 'src/modules/session/enums/session.enum';
import { ISessionService } from 'src/modules/session/interfaces/session.service.interface';
import { SessionEntity } from 'src/modules/session/repository/entities/session.entity';
import { SessionRepository } from 'src/modules/session/repository/repositories/session.repository';

// Minimum gap between lastActiveAt writes for a single session.
const SESSION_ACTIVE_THROTTLE_SECONDS = 60;

@Injectable()
export class SessionService implements ISessionService {
    private readonly refreshTokenExpiration: number;
    private readonly appName: string;

    private readonly sessionKeyPrefix: string;
    private readonly logger = new Logger(SessionService.name);

    constructor(
        @Inject(CACHE_MANAGER) private cacheManager: Cache,
        private readonly configService: ConfigService,
        private readonly helperDateService: HelperDateService,
        private readonly sessionRepository: SessionRepository,
        private readonly messageService: MessageService
    ) {
        this.refreshTokenExpiration = this.configService.get<number>(
            'auth.jwt.refreshToken.expirationTime'
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
            dto.isCurrent = !!currentSessionId && session.id === currentSessionId;
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
        session: SessionEntity
    ): Promise<void> {
        this.logger.debug(`Setting login for user [${user.id}]`);
        const key = `${this.appName}:${this.sessionKeyPrefix}:${session.id}`;

        // refreshTokenExpiration is stored in seconds (auth.config.ts:
        // ms(...) / 1000); cache-manager v6 `set()` takes milliseconds.
        await this.cacheManager.set(
            key,
            { user: user.id },
            this.refreshTokenExpiration * 1000
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

        return repository;
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

    async updateManyRevokeByUser(
        user: string,
        options?: IDatabaseUpdateManyOptions
    ): Promise<boolean> {
        const today = this.helperDateService.create();
        const sessions = await this.findAllByUser(user, undefined, options);
        const promises = sessions.map(e => this.deleteLoginSession(e.id));

        await Promise.all(promises);

        // Scoped to ACTIVE: without it, a "revoke all" rewrote revokeAt on
        // already-REVOKED rows too, collapsing distinct revoke timestamps into
        // one. The updated rows are the real signal for the return value, not
        // a hardcoded true that reports success even when nothing changed.
        const updated = await this.sessionRepository.updateMany(
            {
                user,
                status: ENUM_SESSION_STATUS.ACTIVE,
            },
            {
                status: ENUM_SESSION_STATUS.REVOKED,
                revokeAt: today,
            },
            options
        );

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
