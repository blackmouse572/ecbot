import { AccountEntity } from '@app/modules/account/repository/entities/account.entity';
import {
    ENUM_CHATBOT_STATUS,
    ENUM_CHATBOT_TYPE,
} from '@app/modules/chatbot/enums/chatbot.enum';
import { ChatbotEntity } from '@app/modules/chatbot/repository/entities/chatbot.entity';
import { UserEntity } from '@app/modules/user/repository/entities/user.entity';
import { WorkspaceEntity } from '@app/modules/workspace/repository/entities/workspace.entity';
import { faker } from '@faker-js/faker';
import { Collection, EntityManager } from '@mikro-orm/postgresql';
import { Injectable } from '@nestjs/common';

@Injectable()
export class MigrationChatbotSeed {
    constructor(private readonly em: EntityManager) {}

    async run(): Promise<void> {
        // Get existing workspaces and users
        const workspaces = await this.em.find(
            WorkspaceEntity,
            {},
            { limit: 5 }
        );
        const users = await this.em.find(UserEntity, {}, { limit: 10 });
        const accounts = await this.em.find(AccountEntity, {}, { limit: 10 });

        if (workspaces.length === 0 || users.length === 0) {
            console.log(
                '⚠️  Skipping chatbot seeding - requires workspaces and users'
            );
            return;
        }

        const chatbots: Partial<ChatbotEntity>[] = [];

        // Create beauty chatbots
        for (let i = 0; i < 2; i++) {
            chatbots.push({
                name: faker.company.name() + ' Beauty Assistant',
                avatar: faker.image.avatar(),
                generalKnowledge: `A professional beauty consultant specializing in skincare, makeup, and beauty treatments. ${faker.lorem.paragraph()}`,
                workspace: faker.helpers.arrayElement(workspaces),
                accounts: new Collection([
                    faker.helpers.arrayElement(accounts),
                    faker.helpers.arrayElement(accounts),
                ]),
                typingIndicator: faker.datatype.boolean(),
                autoRead: faker.datatype.boolean(),
                status: faker.helpers.arrayElement(
                    Object.values(ENUM_CHATBOT_STATUS)
                ),
                type: ENUM_CHATBOT_TYPE.BEAUTY,
                createdBy: faker.helpers.arrayElement(users),
            });
        }

        // Create ecommerce chatbots
        for (let i = 0; i < 2; i++) {
            chatbots.push({
                name: faker.company.name() + ' Shopping Bot',
                avatar: faker.image.avatar(),
                generalKnowledge: `An ecommerce assistant helping customers with product inquiries, orders, and support. ${faker.lorem.paragraph()}`,
                workspace: faker.helpers.arrayElement(workspaces),
                accounts: new Collection(faker.helpers.arrayElement(users)),
                typingIndicator: true,
                autoRead: true,
                status: ENUM_CHATBOT_STATUS.ACTIVE,
                type: ENUM_CHATBOT_TYPE.ECOMMERCE,
                createdBy: faker.helpers.arrayElement(users),
            });
        }

        // Create restaurant chatbots
        for (let i = 0; i < 1; i++) {
            chatbots.push({
                name: faker.company.name() + ' Restaurant Bot',
                avatar: faker.image.avatar(),
                generalKnowledge: `A restaurant assistant helping with reservations, menu information, and customer service. ${faker.lorem.paragraph()}`,
                workspace: faker.helpers.arrayElement(workspaces),
                accounts: new Collection(faker.helpers.arrayElement(users)),
                typingIndicator: true,
                autoRead: false,
                status: ENUM_CHATBOT_STATUS.ACTIVE,
                type: ENUM_CHATBOT_TYPE.RESTAURANT,
                createdBy: faker.helpers.arrayElement(users),
            });
        }

        // Create healthcare chatbots
        for (let i = 0; i < 1; i++) {
            chatbots.push({
                name: faker.company.name() + ' Health Assistant',
                avatar: faker.image.avatar(),
                generalKnowledge: `A healthcare assistant providing general health information and appointment scheduling. ${faker.lorem.paragraph()}`,
                workspace: faker.helpers.arrayElement(workspaces),
                accounts: new Collection(faker.helpers.arrayElement(users)),
                typingIndicator: true,
                autoRead: true,
                status: ENUM_CHATBOT_STATUS.ACTIVE,
                type: ENUM_CHATBOT_TYPE.HEALTHCARE,
                createdBy: faker.helpers.arrayElement(users),
            });
        }

        // Create various other types
        const otherTypes = [
            ENUM_CHATBOT_TYPE.FASHION,
            ENUM_CHATBOT_TYPE.TRAVEL,
            ENUM_CHATBOT_TYPE.EDUCATION,
            ENUM_CHATBOT_TYPE.FITNESS,
        ];

        for (const type of otherTypes) {
            chatbots.push({
                name:
                    faker.company.name() +
                    ` ${type.charAt(0).toUpperCase() + type.slice(1)} Bot`,
                avatar: faker.image.avatar(),
                generalKnowledge: `A specialized ${type} assistant. ${faker.lorem.paragraph()}`,
                workspace: faker.helpers.arrayElement(workspaces),
                accounts: new Collection([
                    faker.helpers.arrayElement(users),
                    faker.helpers.arrayElement(users),
                ]),
                typingIndicator: faker.datatype.boolean(),
                autoRead: faker.datatype.boolean(),
                status: faker.helpers.arrayElement(
                    Object.values(ENUM_CHATBOT_STATUS)
                ),
                type: type,
                createdBy: faker.helpers.arrayElement(users),
            });
        }

        // Create an inactive/archived chatbot
        chatbots.push({
            name: 'Legacy Support Bot',
            avatar: faker.image.avatar(),
            generalKnowledge: 'A legacy chatbot that is no longer active.',
            workspace: faker.helpers.arrayElement(workspaces),
            accounts: new Collection<AccountEntity>([]),
            typingIndicator: false,
            autoRead: false,
            status: ENUM_CHATBOT_STATUS.ARCHIVED,
            type: ENUM_CHATBOT_TYPE.ENTERTAINMENT,
            createdBy: faker.helpers.arrayElement(users),
        });

        // Save all chatbots
        for (const chatbotData of chatbots) {
            const chatbot = this.em.create(ChatbotEntity, chatbotData);
            this.em.persist(chatbot);
        }

        await this.em.flush();
        console.log(`✅ Seeded ${chatbots.length} chatbots`);
    }
}
