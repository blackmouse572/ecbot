import { Module } from '@nestjs/common';
import { ApiKeyModule } from 'src/modules/api-key/api-key.module';
import { EmailTaskController } from 'src/modules/email/controllers/email.task.controller';
import { EmailModule } from 'src/modules/email/email.module';
import { SmsTaskController } from 'src/modules/sms/controllers/sms.task.controller';
import { SmsModule } from 'src/modules/sms/sms.module';
import { FollowupTaskController } from 'src/modules/platform/controllers/followup.task.controller';
import { PlatformModule } from 'src/modules/platform/platform.module';
import { KnowledgeIngestTaskController } from 'src/modules/knowledge-base/controllers/knowledge-ingest.task.controller';
import { KnowledgeBaseServicesModule } from 'src/modules/knowledge-base/services/services.module';
import { CustomerTagClassifierTaskController } from 'src/modules/customer/controllers/customer-tag-classifier.task.controller';
import { CustomerModule } from 'src/modules/customer/customer.module';

/**
 * Cloud Tasks callback consumers — one controller per migrated BullMQ
 * processor (`<feature>.task.controller.ts`). Split out from
 * RoutesSystemModule so this stays a single, focused home as the remaining
 * processors (sms, followup, knowledge-ingest, customer-tag-classifier,
 * session) migrate the same way. Registered under the `/system` prefix in
 * router.module.ts, alongside RoutesSystemModule, so the deployed callback
 * URL (`/api/v1/system/tasks/:queue`) is unchanged.
 */
@Module({
    controllers: [
        EmailTaskController,
        SmsTaskController,
        FollowupTaskController,
        KnowledgeIngestTaskController,
        CustomerTagClassifierTaskController,
    ],
    providers: [],
    exports: [],
    imports: [
        ApiKeyModule,
        EmailModule.register(),
        SmsModule,
        PlatformModule,
        KnowledgeBaseServicesModule,
        CustomerModule,
    ],
})
export class RoutesTasksModule {}
