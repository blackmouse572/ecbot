import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import {
    CloudTasksQueueClient,
    CLOUD_TASKS_CLIENT,
} from '../../src/worker/cloud-tasks-queue.client';

describe('CloudTasksQueueClient.enqueue', () => {
    let client: CloudTasksQueueClient;
    const createTask = jest.fn();
    const deleteTask = jest.fn();
    const listTasksAsync = jest.fn();
    const queuePath = jest.fn(
        (project: string, location: string, queue: string) =>
            `projects/${project}/locations/${location}/queues/${queue}`
    );
    const taskPath = jest.fn(
        (project: string, location: string, queue: string, task: string) =>
            `projects/${project}/locations/${location}/queues/${queue}/tasks/${task}`
    );

    const config = {
        get: jest.fn((key: string) => {
            const values: Record<string, string> = {
                'cloudTasks.projectId': 'eccho-dev',
                'cloudTasks.location': 'asia-southeast1',
                'cloudTasks.systemApiKey': 'sys-key:sys-secret',
                'app.backendUrl': 'https://api.example.com',
            };
            return values[key];
        }),
    };

    beforeEach(async () => {
        createTask.mockReset().mockResolvedValue([{}]);
        deleteTask.mockReset();
        listTasksAsync.mockReset();
        queuePath.mockClear();
        taskPath.mockClear();
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                CloudTasksQueueClient,
                { provide: ConfigService, useValue: config },
                {
                    provide: CLOUD_TASKS_CLIENT,
                    useValue: {
                        createTask,
                        deleteTask,
                        listTasksAsync,
                        queuePath,
                        taskPath,
                    },
                },
            ],
        }).compile();
        client = module.get(CloudTasksQueueClient);
    });

    it('creates an HTTP task targeting /api/v1/system/tasks/:queue with the system api-key header', async () => {
        await client.enqueue('email', 'WELCOME', {
            send: { email: 'a@b.com' },
        });

        expect(createTask).toHaveBeenCalledWith({
            parent: 'projects/eccho-dev/locations/asia-southeast1/queues/email',
            task: {
                name: undefined,
                httpRequest: {
                    httpMethod: 'POST',
                    url: 'https://api.example.com/api/v1/system/tasks/email',
                    headers: {
                        'content-type': 'application/json',
                        'x-api-key': 'sys-key:sys-secret',
                    },
                    body: Buffer.from(
                        JSON.stringify({
                            jobName: 'WELCOME',
                            send: { email: 'a@b.com' },
                        })
                    ).toString('base64'),
                },
                scheduleTime: undefined,
            },
        });
    });

    it('names the task from options.taskName for Cloud Tasks-native dedup', async () => {
        await client.enqueue(
            'email',
            'WELCOME',
            { send: {} },
            { taskName: 'WELCOME-user1' }
        );

        expect(taskPath).toHaveBeenCalledWith(
            'eccho-dev',
            'asia-southeast1',
            'email',
            'WELCOME-user1'
        );
        expect(createTask.mock.calls[0][0].task.name).toBe(
            'projects/eccho-dev/locations/asia-southeast1/queues/email/tasks/WELCOME-user1'
        );
    });

    it('converts options.scheduleTime to Cloud Tasks seconds-since-epoch', async () => {
        const when = new Date('2026-01-01T00:00:10.000Z');
        await client.enqueue(
            'email',
            'WELCOME',
            { send: {} },
            { scheduleTime: when }
        );

        expect(createTask.mock.calls[0][0].task.scheduleTime).toEqual({
            seconds: 1767225610,
        });
    });

    it('deletes a named task and ignores NOT_FOUND', async () => {
        deleteTask.mockRejectedValueOnce(
            Object.assign(new Error('missing'), { code: 5 })
        );

        await expect(
            client.deleteTask('followup', 'followup-f-1')
        ).resolves.toBeUndefined();
        expect(deleteTask).toHaveBeenCalledWith({
            name: 'projects/eccho-dev/locations/asia-southeast1/queues/followup/tasks/followup-f-1',
        });
    });

    it('lists FULL-view tasks and decodes the payload', async () => {
        listTasksAsync.mockReturnValue(
            (async function* () {
                yield {
                    name: 'projects/eccho-dev/locations/asia-southeast1/queues/followup/tasks/followup-f-1',
                    scheduleTime: { seconds: 1767225610 },
                    httpRequest: {
                        body: Buffer.from(
                            JSON.stringify({
                                jobName: 'fire',
                                conversationId: 'conv-1',
                            })
                        ).toString('base64'),
                    },
                };
            })()
        );

        await expect(client.listTasks('followup')).resolves.toEqual([
            {
                taskName: 'followup-f-1',
                scheduleTime: new Date(1767225610000),
                payload: { jobName: 'fire', conversationId: 'conv-1' },
            },
        ]);
        expect(listTasksAsync).toHaveBeenCalledWith({
            parent: 'projects/eccho-dev/locations/asia-southeast1/queues/followup',
            responseView: 'FULL',
        });
    });

    it('skips tasks with malformed or non-JSON bodies', async () => {
        listTasksAsync.mockReturnValue(
            (async function* () {
                yield {
                    name: 'projects/eccho-dev/locations/asia-southeast1/queues/followup/tasks/bad',
                    httpRequest: {
                        body: Buffer.from('{not-json').toString('base64'),
                    },
                };
                yield {
                    name: 'projects/eccho-dev/locations/asia-southeast1/queues/followup/tasks/good',
                    httpRequest: {
                        body: Buffer.from(
                            JSON.stringify({ jobName: 'fire' })
                        ).toString('base64'),
                    },
                };
            })()
        );

        await expect(client.listTasks('followup')).resolves.toEqual([
            {
                taskName: 'good',
                scheduleTime: undefined,
                payload: { jobName: 'fire' },
            },
        ]);
    });

    describe('retry with backoff', () => {
        beforeEach(() => {
            jest.useFakeTimers();
        });

        afterEach(() => {
            jest.useRealTimers();
        });

        it('retries a retryable failure and resolves once createTask succeeds on the 3rd attempt', async () => {
            createTask
                .mockRejectedValueOnce(new Error('unavailable'))
                .mockRejectedValueOnce(new Error('unavailable'))
                .mockResolvedValueOnce([{}]);

            const enqueuePromise = client.enqueue('email', 'WELCOME', {
                send: {},
            });

            await jest.advanceTimersByTimeAsync(100);
            await jest.advanceTimersByTimeAsync(400);

            await expect(enqueuePromise).resolves.toBeUndefined();
            expect(createTask).toHaveBeenCalledTimes(3);
        });

        it('rejects with the last error after exhausting all 3 attempts', async () => {
            const error = new Error('unavailable');
            createTask.mockRejectedValue(error);

            const enqueuePromise = client.enqueue('email', 'WELCOME', {
                send: {},
            });
            const assertion = expect(enqueuePromise).rejects.toBe(error);

            await jest.advanceTimersByTimeAsync(100);
            await jest.advanceTimersByTimeAsync(400);

            await assertion;
            expect(createTask).toHaveBeenCalledTimes(3);
        });

        it('treats ALREADY_EXISTS (code 6) as success and does not retry', async () => {
            const alreadyExistsError = Object.assign(
                new Error('already exists'),
                {
                    code: 6,
                }
            );
            createTask.mockRejectedValueOnce(alreadyExistsError);

            const enqueuePromise = client.enqueue('email', 'WELCOME', {
                send: {},
            });

            await expect(enqueuePromise).resolves.toBeUndefined();
            expect(createTask).toHaveBeenCalledTimes(1);
        });
    });
});
