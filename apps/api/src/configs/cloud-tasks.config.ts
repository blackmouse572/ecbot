import { registerAs } from '@nestjs/config';

export default registerAs(
    'cloudTasks',
    (): Record<string, any> => ({
        projectId: process.env.CLOUD_TASKS_PROJECT_ID,
        location: process.env.CLOUD_TASKS_LOCATION || 'asia-southeast1',
        systemApiKey: process.env.CLOUD_TASKS_SYSTEM_API_KEY,
        /** host:port of the local cloud-tasks-emulator; unset in staging/prod to use real GCP. */
        emulatorHost: process.env.CLOUD_TASKS_EMULATOR_HOST,
    })
);
