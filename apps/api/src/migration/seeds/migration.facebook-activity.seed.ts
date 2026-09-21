import { ENUM_FACEBOOK_MESSAGE_EVENT_TYPE } from '@app/common/enums/facebook.enum';
import { FacebookActivityEntity } from '@app/common/facebook-activity/repository/entities/facebook-activity.entity';
import { faker } from '@faker-js/faker';
import { EntityManager } from '@mikro-orm/postgresql';
import { Injectable } from '@nestjs/common';

@Injectable()
export class MigrationFacebookActivitySeed {
    constructor(private readonly em: EntityManager) {}

    async run(): Promise<void> {
        const activities: Partial<FacebookActivityEntity>[] = [];

        // Create various Facebook message activities
        for (let i = 0; i < 8; i++) {
            const eventType = faker.helpers.arrayElement(
                Object.values(ENUM_FACEBOOK_MESSAGE_EVENT_TYPE)
            );
            const pageId = faker.string.numeric(12);
            const senderId = faker.string.numeric(10);
            const messageId = `mid.${faker.string.alphanumeric(20)}`;

            activities.push({
                pageId: pageId,
                senderId: senderId,
                recipientId: faker.helpers.maybe(() => pageId, {
                    probability: 0.8,
                }),
                eventType: eventType,
                messageId:
                    eventType === ENUM_FACEBOOK_MESSAGE_EVENT_TYPE.MESSAGE
                        ? messageId
                        : undefined,
                messageText:
                    eventType === ENUM_FACEBOOK_MESSAGE_EVENT_TYPE.MESSAGE
                        ? faker.lorem.sentence()
                        : undefined,
                eventPayload: {
                    timestamp: faker.date.recent().getTime(),
                    mid: messageId,
                    text:
                        eventType === ENUM_FACEBOOK_MESSAGE_EVENT_TYPE.MESSAGE
                            ? faker.lorem.sentence()
                            : undefined,
                    ...(eventType ===
                        ENUM_FACEBOOK_MESSAGE_EVENT_TYPE.POSTBACK && {
                        title: faker.lorem.words(3),
                        payload: faker.lorem.word().toUpperCase(),
                    }),
                },
                webhookPayload: {
                    object: 'page',
                    entry: [
                        {
                            id: pageId,
                            time: faker.date.recent().getTime(),
                            messaging: [
                                {
                                    sender: { id: senderId },
                                    recipient: { id: pageId },
                                    timestamp: faker.date.recent().getTime(),
                                    ...(eventType ===
                                        ENUM_FACEBOOK_MESSAGE_EVENT_TYPE.MESSAGE && {
                                        message: {
                                            mid: messageId,
                                            text: faker.lorem.sentence(),
                                        },
                                    }),
                                    ...(eventType ===
                                        ENUM_FACEBOOK_MESSAGE_EVENT_TYPE.POSTBACK && {
                                        postback: {
                                            title: faker.lorem.words(3),
                                            payload: faker.lorem
                                                .word()
                                                .toUpperCase(),
                                        },
                                    }),
                                },
                            ],
                        },
                    ],
                },
                processed: faker.helpers.arrayElement([true, false]),
                processingError: faker.helpers.maybe(
                    () => faker.lorem.sentence(),
                    { probability: 0.2 }
                ),
                processedAt: faker.helpers.maybe(() => faker.date.recent(), {
                    probability: 0.8,
                }),
                metadata: {
                    source: 'webhook',
                    retryCount: faker.number.int({ min: 0, max: 3 }),
                    processingDuration: faker.number.int({ min: 10, max: 500 }),
                },
            });
        }

        // Create some unprocessed activities
        for (let i = 0; i < 3; i++) {
            const pageId = faker.string.numeric(12);
            const senderId = faker.string.numeric(10);

            activities.push({
                pageId: pageId,
                senderId: senderId,
                recipientId: pageId,
                eventType: ENUM_FACEBOOK_MESSAGE_EVENT_TYPE.MESSAGE,
                messageId: `mid.${faker.string.alphanumeric(20)}`,
                messageText: faker.lorem.sentence(),
                eventPayload: {
                    timestamp: faker.date.recent().getTime(),
                    urgent: true,
                },
                webhookPayload: {
                    object: 'page',
                    urgent: true,
                },
                processed: false,
                processingError: null,
                processedAt: null,
                metadata: {
                    source: 'webhook',
                    priority: 'high',
                    retryCount: 0,
                },
            });
        }

        // Save all activities
        for (const activityData of activities) {
            const activity = this.em.create(
                FacebookActivityEntity,
                activityData
            );
            this.em.persist(activity);
        }

        await this.em.flush();
        console.log(`✅ Seeded ${activities.length} Facebook activities`);
    }
}
