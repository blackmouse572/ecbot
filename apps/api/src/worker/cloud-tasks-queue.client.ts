import { Inject, Injectable, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { CloudTasksClient } from '@google-cloud/tasks';

/**
 * Optional override for the underlying client — tests provide a mock here.
 * Left unbound in the app so the real client is built lazily; see `getClient`.
 */
export const CLOUD_TASKS_CLIENT = 'CLOUD_TASKS_CLIENT';

export interface CloudTasksEnqueueOptions {
    /** Cloud Tasks rejects a duplicate task name for ~1h — replaces BullMQ's jobId dedup. */
    taskName?: string;
    /** Delivery delay, replaces BullMQ's `delay` option. */
    scheduleTime?: Date;
}

export interface CloudTaskRecord {
    taskName: string;
    scheduleTime?: Date;
    payload: Record<string, unknown>;
}

/** gRPC status code for ALREADY_EXISTS, exposed as `.code` on google-gax errors. */
const GRPC_STATUS_ALREADY_EXISTS = 6;
/** gRPC status code for NOT_FOUND, which is a successful delete outcome. */
const GRPC_STATUS_NOT_FOUND = 5;

const MAX_ATTEMPTS = 3;
/** Backoff between attempts, in ms — short since some callers are in an HTTP request path. */
const RETRY_BACKOFF_MS = [100, 400];

@Injectable()
export class CloudTasksQueueClient {
    private clientPromise?: Promise<CloudTasksClient>;

    constructor(
        private readonly configService: ConfigService,
        @Optional()
        @Inject(CLOUD_TASKS_CLIENT)
        private readonly injectedClient?: CloudTasksClient
    ) {}

    /**
     * @google-cloud/tasks drags in google-gax + grpc-js + protobufjs (~4MB of
     * JS) — far too much to pay for on every boot when most instances never
     * enqueue. Build it on first use instead.
     */
    private getClient(): Promise<CloudTasksClient> {
        if (this.injectedClient) return Promise.resolve(this.injectedClient);

        // Don't cache a rejection — a failed first attempt would otherwise
        // poison every later enqueue until the process restarts.
        return (this.clientPromise ??= this.createClient().catch(err => {
            this.clientPromise = undefined;
            throw err;
        }));
    }

    private async createClient(): Promise<CloudTasksClient> {
        const { CloudTasksClient } = await import('@google-cloud/tasks');
        const emulatorHost = this.configService.get<string>(
            'cloudTasks.emulatorHost'
        );

        if (!emulatorHost) return new CloudTasksClient();

        const { credentials } = await import('@grpc/grpc-js');
        const [servicePath, port] = emulatorHost.split(':');

        return new CloudTasksClient({
            servicePath,
            port: port ? Number(port) : 443,
            sslCreds: credentials.createInsecure(),
        });
    }

    async enqueue(
        queue: string,
        jobName: string,
        payload: Record<string, any>,
        options: CloudTasksEnqueueOptions = {}
    ): Promise<void> {
        const backendUrl = this.configService.get<string>('app.backendUrl');
        const systemApiKey = this.configService.get<string>(
            'cloudTasks.systemApiKey'
        );

        const body = Buffer.from(
            JSON.stringify({ jobName, ...payload })
        ).toString('base64');

        const client = await this.getClient();
        const request = {
            parent: client.queuePath(this.projectId, this.location, queue),
            task: {
                name: options.taskName
                    ? client.taskPath(
                          this.projectId,
                          this.location,
                          queue,
                          options.taskName
                      )
                    : undefined,
                httpRequest: {
                    httpMethod: 'POST' as const,
                    url: `${backendUrl}/api/v1/system/tasks/${queue}`,
                    headers: {
                        'content-type': 'application/json',
                        'x-api-key': systemApiKey,
                    },
                    body,
                },
                scheduleTime: options.scheduleTime
                    ? {
                          seconds: Math.floor(
                              options.scheduleTime.getTime() / 1000
                          ),
                      }
                    : undefined,
            },
        };

        let lastError: unknown;

        for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
            try {
                await client.createTask(request);
                return;
            } catch (err: unknown) {
                if (
                    (err as { code?: number })?.code ===
                    GRPC_STATUS_ALREADY_EXISTS
                ) {
                    // A prior attempt already created this exact taskName — goal achieved.
                    return;
                }

                lastError = err;
                if (attempt < MAX_ATTEMPTS) {
                    await this.delay(RETRY_BACKOFF_MS[attempt - 1]);
                }
            }
        }

        throw lastError;
    }

    async deleteTask(queue: string, taskName: string): Promise<void> {
        const client = await this.getClient();

        try {
            await client.deleteTask({
                name: client.taskPath(
                    this.projectId,
                    this.location,
                    queue,
                    taskName
                ),
            });
        } catch (err: unknown) {
            if ((err as { code?: number })?.code === GRPC_STATUS_NOT_FOUND)
                return;
            throw err;
        }
    }

    async listTasks(queue: string): Promise<CloudTaskRecord[]> {
        const client = await this.getClient();
        const records: CloudTaskRecord[] = [];
        for await (const task of client.listTasksAsync({
            parent: client.queuePath(this.projectId, this.location, queue),
            responseView: 'FULL',
        })) {
            const body = task.httpRequest?.body;
            if (!body || !task.name) continue;

            let payload: Record<string, unknown>;
            try {
                payload = JSON.parse(
                    Buffer.from(body as string, 'base64').toString('utf8')
                ) as Record<string, unknown>;
            } catch {
                continue;
            }
            const scheduleSeconds = task.scheduleTime?.seconds;
            records.push({
                taskName: task.name.split('/').pop() as string,
                scheduleTime:
                    scheduleSeconds === undefined
                        ? undefined
                        : new Date(Number(scheduleSeconds) * 1000),
                payload,
            });
        }

        return records;
    }

    private get projectId(): string {
        return this.configService.get<string>('cloudTasks.projectId')!;
    }

    private get location(): string {
        return this.configService.get<string>('cloudTasks.location')!;
    }

    private delay(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}
