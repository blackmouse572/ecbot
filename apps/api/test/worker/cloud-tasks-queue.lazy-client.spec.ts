import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { CloudTasksQueueClient } from '../../src/worker/cloud-tasks-queue.client';

// The rest of the CloudTasksQueueClient suite injects a mock through the
// CLOUD_TASKS_CLIENT token, which short-circuits getClient() and never touches
// the dynamic `import('@google-cloud/tasks')`. These tests cover the path
// production actually takes: no bound token, client built on first use.
describe('CloudTasksQueueClient — lazy client construction', () => {
    const config = {
        get: jest.fn((key: string) => {
            const values: Record<string, string> = {
                'cloudTasks.projectId': 'eccho-dev',
                'cloudTasks.location': 'asia-southeast1',
            };
            return values[key];
        }),
    };

    // Deliberately no CLOUD_TASKS_CLIENT provider — that's the production
    // wiring after the token became an @Optional() test-only override.
    async function buildClient(): Promise<CloudTasksQueueClient> {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                CloudTasksQueueClient,
                { provide: ConfigService, useValue: config },
            ],
        }).compile();

        return module.get(CloudTasksQueueClient);
    }

    it('resolves without a CLOUD_TASKS_CLIENT provider bound', async () => {
        const client = await buildClient();

        const real = await (client as any).getClient();

        expect(typeof real.queuePath).toBe('function');
        expect(real.queuePath('eccho-dev', 'asia-southeast1', 'email')).toBe(
            'projects/eccho-dev/locations/asia-southeast1/queues/email'
        );
    });

    it('builds the client once and reuses it across calls', async () => {
        const client = await buildClient();

        const [first, second] = await Promise.all([
            (client as any).getClient(),
            (client as any).getClient(),
        ]);

        expect(first).toBe(second);
    });

    it('does not cache a failed construction', async () => {
        const client = await buildClient();
        const createClient = jest
            .spyOn(client as any, 'createClient')
            .mockRejectedValueOnce(new Error('boom'))
            .mockResolvedValueOnce({ queuePath: jest.fn() } as any);

        await expect((client as any).getClient()).rejects.toThrow('boom');
        await expect((client as any).getClient()).resolves.toBeDefined();
        expect(createClient).toHaveBeenCalledTimes(2);
    });
});
