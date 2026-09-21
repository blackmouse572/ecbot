import {
    ENUM_ACCOUNT_STATUS,
    ENUM_ACCOUNT_TYPE,
} from '@app/modules/account/enums/account.enum';
import { AccountEntity } from '@app/modules/account/repository/entities/account.entity';
import { UserEntity } from '@app/modules/user/repository/entities/user.entity';
import { WorkspaceEntity } from '@app/modules/workspace/repository/entities/workspace.entity';
import { faker } from '@faker-js/faker';
import { EntityManager } from '@mikro-orm/postgresql';
import { Injectable } from '@nestjs/common';

@Injectable()
export class MigrationAccountSeed {
    constructor(private readonly em: EntityManager) {}

    async run(): Promise<void> {
        // Get existing workspaces and users
        const workspaces = await this.em.find(
            WorkspaceEntity,
            {},
            { limit: 5 }
        );
        const users = await this.em.find(UserEntity, {}, { limit: 10 });

        if (workspaces.length === 0 || users.length === 0) {
            console.log(
                '⚠️  Skipping account seeding - requires workspaces and users'
            );
            return;
        }

        const accounts: Partial<AccountEntity>[] = [];

        // Create Facebook accounts
        for (let i = 0; i < 3; i++) {
            accounts.push({
                externalId: faker.string.numeric(15), // Facebook page ID format
                name: faker.company.name() + ' Facebook Page',
                slug: faker.helpers.slugify(faker.company.name()).toLowerCase(),
                avatar: faker.image.avatar(),
                link: `https://facebook.com/${faker.helpers.slugify(faker.company.name())}`,
                status: faker.helpers.arrayElement(
                    Object.values(ENUM_ACCOUNT_STATUS)
                ),
                createdBy: faker.helpers.arrayElement(users),
                workspace: faker.helpers.arrayElement(workspaces),
                type: ENUM_ACCOUNT_TYPE.FACEBOOK_PAGE,
                accessToken: faker.string.alphanumeric(64),
            });
        }

        // Create Instagram accounts
        for (let i = 0; i < 3; i++) {
            accounts.push({
                externalId: faker.string.numeric(12), // Instagram ID format
                name: faker.person.fullName() + ' Instagram',
                slug: faker.internet.username().toLowerCase(),
                avatar: faker.image.avatar(),
                link: `https://instagram.com/${faker.internet.username()}`,
                status: faker.helpers.arrayElement(
                    Object.values(ENUM_ACCOUNT_STATUS)
                ),
                createdBy: faker.helpers.arrayElement(users),
                workspace: faker.helpers.arrayElement(workspaces),
                type: ENUM_ACCOUNT_TYPE.INSTAGRAM_ACCOUNT,
                accessToken: faker.string.alphanumeric(64),
            });
        }

        // Create Zalo accounts
        for (let i = 0; i < 2; i++) {
            accounts.push({
                externalId: faker.string.numeric(10), // Zalo ID format
                name: faker.company.name() + ' Zalo',
                slug: faker.helpers.slugify(faker.company.name()).toLowerCase(),
                avatar: faker.image.avatar(),
                link: `https://zalo.me/${faker.helpers.slugify(faker.company.name())}`,
                status: faker.helpers.arrayElement(
                    Object.values(ENUM_ACCOUNT_STATUS)
                ),
                createdBy: faker.helpers.arrayElement(users),
                workspace: faker.helpers.arrayElement(workspaces),
                type: ENUM_ACCOUNT_TYPE.ZALO_PAGE,
                accessToken: faker.string.alphanumeric(32),
            });
        }

        // Create linked sub-accounts
        const mainAccount = accounts[0];
        const subAccount = {
            externalId: faker.string.numeric(15) + '_sub', // Sub account ID
            name: mainAccount.name + ' - Sub Account',
            slug: mainAccount.slug + '-sub',
            avatar: faker.image.avatar(),
            link: mainAccount.link + '/sub',
            status: ENUM_ACCOUNT_STATUS.ACTIVE,
            createdBy: mainAccount.createdBy,
            workspace: mainAccount.workspace,
            type: mainAccount.type,
            accessToken: faker.string.alphanumeric(64),
            proxies: [],
            account: mainAccount as AccountEntity, // Link to parent account
        };
        accounts.push(subAccount);

        // Save all accounts
        for (const accountData of accounts) {
            const account = this.em.create(AccountEntity, accountData);
            this.em.persist(account);
        }

        await this.em.flush();
        console.log(`✅ Seeded ${accounts.length} accounts`);
    }
}
