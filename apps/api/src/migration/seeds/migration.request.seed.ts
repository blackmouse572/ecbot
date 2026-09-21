import {
    REQUEST_STATUS,
    REQUEST_TYPE,
} from '@app/modules/requests/constant/requests.constant';
import { RequestEntity } from '@app/modules/requests/repository/entities/requests.entity';
import { UserEntity } from '@app/modules/user/repository/entities/user.entity';
import { WorkspaceEntity } from '@app/modules/workspace/repository/entities/workspace.entity';
import { faker } from '@faker-js/faker';
import { EntityManager } from '@mikro-orm/postgresql';
import { Injectable } from '@nestjs/common';

@Injectable()
export class MigrationRequestSeed {
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
                '⚠️  Skipping request seeding - requires workspaces and users'
            );
            return;
        }

        const requests: Partial<RequestEntity>[] = [];

        // Create join workspace requests
        for (let i = 0; i < 5; i++) {
            const requestFrom = faker.helpers.arrayElement(users);
            const requestTo = faker.helpers.arrayElement(
                users.filter(u => u.id !== requestFrom.id)
            );
            const workspace = faker.helpers.arrayElement(workspaces);

            requests.push({
                type: REQUEST_TYPE.JOIN_WORKSPACE,
                workspace: workspace,
                requestFrom: requestFrom,
                requestTo: requestTo,
                payload: {
                    workspaceId: workspace.id,
                    requestedRole: 'member',
                    message: faker.lorem.sentence(),
                },
                status: faker.helpers.arrayElement(
                    Object.values(REQUEST_STATUS)
                ),
                reason: faker.helpers.maybe(() => faker.lorem.sentence(), {
                    probability: 0.7,
                }),
                processedBy: faker.helpers.maybe(() => requestTo, {
                    probability: 0.6,
                }),
            });
        }

        // Create config change requests
        for (let i = 0; i < 3; i++) {
            const requestFrom = faker.helpers.arrayElement(users);
            const requestTo = faker.helpers.arrayElement(
                users.filter(u => u.id !== requestFrom.id)
            );
            const workspace = faker.helpers.arrayElement(workspaces);

            requests.push({
                type: REQUEST_TYPE.CHANGE_CONFIG,
                workspace: workspace,
                requestFrom: requestFrom,
                requestTo: requestTo,
                payload: {
                    configType: faker.helpers.arrayElement([
                        'notification',
                        'security',
                        'integration',
                    ]),
                    changes: {
                        oldValue: faker.lorem.word(),
                        newValue: faker.lorem.word(),
                        reason: faker.lorem.sentence(),
                    },
                    urgency: faker.helpers.arrayElement([
                        'low',
                        'medium',
                        'high',
                    ]),
                },
                status: faker.helpers.arrayElement(
                    Object.values(REQUEST_STATUS)
                ),
                reason: faker.helpers.maybe(() => faker.lorem.sentence(), {
                    probability: 0.8,
                }),
                processedBy: faker.helpers.maybe(() => requestTo, {
                    probability: 0.7,
                }),
            });
        }

        // Create some pending requests
        for (let i = 0; i < 2; i++) {
            const requestFrom = faker.helpers.arrayElement(users);
            const requestTo = faker.helpers.arrayElement(
                users.filter(u => u.id !== requestFrom.id)
            );

            requests.push({
                type: faker.helpers.arrayElement(Object.values(REQUEST_TYPE)),
                workspace: faker.helpers.arrayElement(workspaces),
                requestFrom: requestFrom,
                requestTo: requestTo,
                payload: {
                    note: faker.lorem.paragraph(),
                    priority: faker.helpers.arrayElement(['normal', 'urgent']),
                },
                status: REQUEST_STATUS.PENDING,
                reason: null,
                processedBy: null,
            });
        }

        // Save all requests
        for (const requestData of requests) {
            const request = this.em.create(RequestEntity, requestData);
            this.em.persist(request);
        }

        await this.em.flush();
        console.log(`✅ Seeded ${requests.length} requests`);
    }
}
