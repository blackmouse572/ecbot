import { Module } from '@nestjs/common';
import { CloudTasksQueueClient } from './cloud-tasks-queue.client';

// No CLOUD_TASKS_CLIENT provider on purpose: CloudTasksQueueClient builds the
// @google-cloud/tasks client on first use so the gRPC stack stays off the boot
// path. Tests still bind the token to inject a mock.
@Module({
    providers: [CloudTasksQueueClient],
    exports: [CloudTasksQueueClient],
})
export class CloudTasksQueueModule {}
