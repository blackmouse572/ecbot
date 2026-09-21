import { EntityManager } from '@mikro-orm/postgresql';
import { Injectable } from '@nestjs/common';
import { ENUM_SESSION_STATUS } from 'src/modules/session/enums/session.enum';
import { SessionEntity } from 'src/modules/session/repository/entities/session.entity';
import { UserEntity } from 'src/modules/user/repository/entities/user.entity';

@Injectable()
export class MigrationSessionSeed {
    constructor(private readonly em: EntityManager) {}

    async seeds(): Promise<void> {
        // Find test users for session creation
        const users = await this.em.find(UserEntity, {}, { limit: 3 });

        if (users.length === 0) {
            console.log(
                'No users found for session seeding. Please seed users first.'
            );
            return;
        }

        const sessionData = [
            {
                status: ENUM_SESSION_STATUS.ACTIVE,
                user: users[0],
                ip: '192.168.1.100',
                hostname: 'localhost',
                protocol: 'https',
                originalUrl: '/api/v1/auth/login',
                method: 'POST',
                userAgent:
                    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                expiredAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours from now
            },
            {
                status: ENUM_SESSION_STATUS.ACTIVE,
                user: users[1],
                ip: '192.168.1.101',
                hostname: 'localhost',
                protocol: 'https',
                originalUrl: '/api/v1/dashboard',
                method: 'GET',
                userAgent:
                    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
                xForwardedFor: '10.0.0.1',
                expiredAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours from now
            },
            {
                status: ENUM_SESSION_STATUS.REVOKED,
                user: users[2],
                ip: '192.168.1.102',
                hostname: 'localhost',
                protocol: 'https',
                originalUrl: '/api/v1/auth/logout',
                method: 'POST',
                userAgent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36',
                revokeAt: new Date(),
                expiredAt: new Date(Date.now() - 1 * 60 * 60 * 1000), // 1 hour ago (expired)
            },
        ];

        for (const sessionDataItem of sessionData) {
            const session = this.em.create(SessionEntity, sessionDataItem);
            this.em.persist(session);
        }

        await this.em.flush();
    }

    async remove(): Promise<void> {
        await this.em.nativeDelete(SessionEntity, {});
    }
}
