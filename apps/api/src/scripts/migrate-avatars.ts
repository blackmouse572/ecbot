import { NestFactory } from '@nestjs/core';
import { EntityManager } from '@mikro-orm/postgresql';
import { AppModule } from 'src/app/app.module';
import { ConversationEntity } from 'src/modules/conversation/repository/entities/conversation.entity';
import { fetchAsBase64 } from 'src/common/utils/fetch-as-base64.util';

const BATCH_SIZE = 50;

async function run(): Promise<void> {
    const app = await NestFactory.createApplicationContext(AppModule, {
        logger: ['error', 'warn'],
    });
    const em = app.get(EntityManager);

    let offset = 0;
    let converted = 0;
    let cleared = 0;
    let total = 0;

    while (true) {
        const batch = await em.find(
            ConversationEntity,
            { senderAvatar: { $ne: null } },
            { limit: BATCH_SIZE, offset }
        );
        if (batch.length === 0) break;

        const toMigrate = batch.filter(
            c => c.senderAvatar && !c.senderAvatar.startsWith('data:')
        );

        const results = await Promise.all(
            toMigrate.map(async conv => {
                const base64 = await fetchAsBase64(conv.senderAvatar!);
                if (base64) {
                    conv.senderAvatar = base64;
                    return 'converted' as const;
                } else {
                    conv.senderAvatar = null;
                    conv.senderProfileFetchedAt = null;
                    return 'cleared' as const;
                }
            })
        );

        converted += results.filter(r => r === 'converted').length;
        cleared += results.filter(r => r === 'cleared').length;
        total += batch.length;

        await em.flush();
        em.clear();

        console.log(
            `Processed ${total} rows so far (converted: ${converted}, cleared: ${cleared})`
        );

        offset += batch.length;
    }

    console.log(`Done. Converted: ${converted}, Cleared: ${cleared}.`);
    await app.close();
}

run().catch(err => {
    console.error(err);
    process.exit(1);
});
