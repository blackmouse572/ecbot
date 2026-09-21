import { EntityManager } from '@mikro-orm/postgresql';
import { Injectable } from '@nestjs/common';
import { AuthService } from 'src/modules/auth/services/auth.service';
import { ENUM_PASSWORD_HISTORY_TYPE } from 'src/modules/password-history/enums/password-history.enum';
import { PasswordHistoryEntity } from 'src/modules/password-history/repository/entities/password-history.entity';
import { UserEntity } from 'src/modules/user/repository/entities/user.entity';

@Injectable()
export class MigrationPasswordHistorySeed {
    constructor(
        private readonly em: EntityManager,
        private readonly authService: AuthService
    ) {}

    async seeds(): Promise<void> {
        // Find test users for password history creation
        const users = await this.em.find(UserEntity, {}, { limit: 2 });

        if (users.length === 0) {
            console.log(
                'No users found for password history seeding. Please seed users first.'
            );
            return;
        }

        const oldPassword1 = 'oldPassword123';
        const oldPassword2 = 'previousPass456';
        const oldPasswordHash1 = this.authService.createPassword(oldPassword1);
        const oldPasswordHash2 = this.authService.createPassword(oldPassword2);

        const passwordHistoryData = [
            {
                user: users[0],
                password: oldPasswordHash1.passwordHash,
                type: ENUM_PASSWORD_HISTORY_TYPE.FORGOT,
                expiredAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
                by: users[0], // Self-reset
            },
            {
                user: users[0],
                password: oldPasswordHash2.passwordHash,
                type: ENUM_PASSWORD_HISTORY_TYPE.CHANGE,
                expiredAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000), // 15 days ago
                by: users[0], // Self-change
            },
            {
                user: users[1],
                password: oldPasswordHash1.passwordHash,
                type: ENUM_PASSWORD_HISTORY_TYPE.TEMPORARY,
                expiredAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
                by: users[0], // Admin reset
            },
        ];

        for (const passwordHistoryDataItem of passwordHistoryData) {
            const passwordHistory = this.em.create(
                PasswordHistoryEntity,
                passwordHistoryDataItem
            );
            this.em.persist(passwordHistory);
        }

        await this.em.flush();
    }

    async remove(): Promise<void> {
        await this.em.nativeDelete(PasswordHistoryEntity, {});
    }
}
