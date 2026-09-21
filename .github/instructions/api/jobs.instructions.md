---
applyTo: "apps/api/**/*.ts"
description: "Background job processing with BullMQ including queue management and job processors"
---

# Background Jobs Instructions

## Technology Stack

- **Queue System**: BullMQ
- **Storage**: Redis
- **Workers**: Separate processor classes in module folders

## Queue Setup

### Define Queue in Module

```typescript
import { BullModule } from "@nestjs/bullmq";

@Module({
  imports: [
    BullModule.registerQueue({
      name: "email-queue",
    }),
  ],
  providers: [EmailProcessor, EmailService],
})
export class EmailModule {}
```

### Multiple Queues

```typescript
@Module({
  imports: [
    BullModule.registerQueue(
      { name: "email-queue" },
      { name: "sms-queue" },
      { name: "export-queue" },
    ),
  ],
})
export class NotificationModule {}
```

## Job Processors

### Basic Processor

Place processors in the `processors/` folder of your module:

```typescript
import { Processor, Process } from "@nestjs/bullmq";
import { Job } from "bullmq";

@Processor("email-queue")
export class EmailProcessor {
  constructor(private readonly emailService: EmailService) {}

  @Process("send-email")
  async handleSendEmail(job: Job<SendEmailDto>) {
    const { to, subject, body } = job.data;

    await this.emailService.send({
      to,
      subject,
      body,
    });

    return { sent: true, timestamp: new Date() };
  }
}
```

### Multiple Job Types

```typescript
@Processor("notification-queue")
export class NotificationProcessor {
  constructor(
    private readonly emailService: EmailService,
    private readonly smsService: SmsService,
  ) {}

  @Process("send-email")
  async handleEmail(job: Job<EmailData>) {
    await this.emailService.send(job.data);
  }

  @Process("send-sms")
  async handleSms(job: Job<SmsData>) {
    await this.smsService.send(job.data);
  }

  @Process("send-push")
  async handlePush(job: Job<PushData>) {
    await this.pushService.send(job.data);
  }
}
```

## Adding Jobs to Queue

### Inject Queue

```typescript
import { InjectQueue } from "@nestjs/bullmq";
import { Queue } from "bullmq";

@Injectable()
export class UserService {
  constructor(
    @InjectQueue("email-queue")
    private readonly emailQueue: Queue,
  ) {}

  async createUser(dto: UserCreateDto): Promise<UserEntity> {
    const user = await this.userRepository.create(dto);

    // Add welcome email to queue
    await this.emailQueue.add("send-email", {
      to: user.email,
      subject: "Welcome to Ecbot",
      template: "welcome",
      data: { name: user.username },
    });

    return user;
  }
}
```

### Job Options

```typescript
// Immediate job
await this.emailQueue.add("send-email", emailData);

// Delayed job (5 seconds)
await this.emailQueue.add("send-email", emailData, {
  delay: 5000,
});

// Job with retry
await this.emailQueue.add("send-email", emailData, {
  attempts: 3,
  backoff: {
    type: "exponential",
    delay: 2000,
  },
});

// Job with priority (higher = more important)
await this.emailQueue.add("send-email", emailData, {
  priority: 10,
});

// Remove job on completion
await this.emailQueue.add("send-email", emailData, {
  removeOnComplete: true,
  removeOnFail: false,
});
```

## Scheduled Jobs

### Recurring Jobs

```typescript
// Add recurring job (every hour)
await this.emailQueue.add(
  "send-digest",
  { type: "daily" },
  {
    repeat: {
      pattern: "0 * * * *", // Cron pattern
    },
  },
);

// Every day at midnight
await this.emailQueue.add(
  "daily-report",
  {},
  {
    repeat: {
      pattern: "0 0 * * *",
    },
  },
);
```

## Job Events and Lifecycle

### Handle Job Events

```typescript
@Processor("export-queue")
export class ExportProcessor {
  private readonly logger = new Logger(ExportProcessor.name);

  @Process("export-users")
  async handleExport(job: Job<ExportDto>) {
    this.logger.log(`Processing job ${job.id}`);

    try {
      // Update progress
      await job.updateProgress(0);

      const data = await this.fetchData(job.data);
      await job.updateProgress(50);

      const file = await this.generateFile(data);
      await job.updateProgress(100);

      return { file, count: data.length };
    } catch (error) {
      this.logger.error(`Job ${job.id} failed: ${error.message}`);
      throw error;
    }
  }

  @OnQueueActive()
  onActive(job: Job) {
    this.logger.log(`Job ${job.id} is now active`);
  }

  @OnQueueCompleted()
  onCompleted(job: Job, result: any) {
    this.logger.log(`Job ${job.id} completed with result:`, result);
  }

  @OnQueueFailed()
  onFailed(job: Job, error: Error) {
    this.logger.error(`Job ${job.id} failed:`, error);
  }
}
```

## Job Progress Tracking

```typescript
@Process('long-operation')
async handleLongOperation(job: Job<OperationDto>) {
    const steps = 10;

    for (let i = 0; i < steps; i++) {
        await this.performStep(i);

        // Update progress percentage
        await job.updateProgress((i + 1) / steps * 100);
    }

    return { completed: true };
}
```

## Queue Management

### Service for Queue Operations

```typescript
@Injectable()
export class QueueManagementService {
  constructor(
    @InjectQueue("email-queue")
    private readonly emailQueue: Queue,
  ) {}

  async getJobCounts(): Promise<any> {
    return await this.emailQueue.getJobCounts();
  }

  async pauseQueue(): Promise<void> {
    await this.emailQueue.pause();
  }

  async resumeQueue(): Promise<void> {
    await this.emailQueue.resume();
  }

  async cleanQueue(): Promise<void> {
    await this.emailQueue.clean(0, 1000, "completed");
    await this.emailQueue.clean(0, 1000, "failed");
  }

  async getJob(jobId: string): Promise<Job | null> {
    return await this.emailQueue.getJob(jobId);
  }

  async removeJob(jobId: string): Promise<void> {
    const job = await this.emailQueue.getJob(jobId);
    if (job) {
      await job.remove();
    }
  }
}
```

## Bulk Operations

```typescript
// Add multiple jobs at once
async sendBulkEmails(recipients: string[]): Promise<void> {
    const jobs = recipients.map(email => ({
        name: 'send-email',
        data: {
            to: email,
            subject: 'Announcement',
            template: 'announcement',
        },
    }));

    await this.emailQueue.addBulk(jobs);
}
```

## Error Handling

```typescript
@Process('risky-operation')
async handleRiskyOperation(job: Job<any>) {
    try {
        await this.performOperation(job.data);
    } catch (error) {
        // Log error
        this.logger.error(`Job ${job.id} error:`, error);

        // Check retry attempts
        if (job.attemptsMade < job.opts.attempts) {
            throw error; // Will retry
        }

        // Final failure - send notification
        await this.notifyAdmins(job, error);
        throw error;
    }
}
```

## Best Practices

1. **Separate processors** - One processor per queue, in module's `processors/` folder
2. **Use job options** - Configure retry, delay, priority appropriately
3. **Track progress** - Update job progress for long operations
4. **Handle failures** - Implement proper error handling and retries
5. **Clean up jobs** - Remove completed/failed jobs periodically
6. **Monitor queues** - Track job counts and queue health
7. **Use events** - Handle job lifecycle events for logging
8. **Limit concurrency** - Configure worker concurrency based on resources
9. **Idempotent jobs** - Design jobs to be safely retryable
10. **Separate critical jobs** - Use different queues for different priorities

## Common Patterns

### Email Queue Pattern

```typescript
// In processors/email.processor.ts
@Processor("email-queue")
export class EmailProcessor {
  @Process("send-welcome")
  async sendWelcome(job: Job<{ email: string; name: string }>) {
    await this.emailService.sendWelcome(job.data);
  }

  @Process("send-reset-password")
  async sendResetPassword(job: Job<{ email: string; token: string }>) {
    await this.emailService.sendResetPassword(job.data);
  }
}
```

### Export Queue Pattern

```typescript
@Processor("export-queue")
export class ExportProcessor {
  @Process("export-excel")
  async exportExcel(job: Job<ExportDto>) {
    const data = await this.fetchData(job.data);
    const file = await this.excelService.generate(data);

    // Upload to S3
    const url = await this.s3Service.upload(file);

    // Notify user
    await this.notificationQueue.add("send-email", {
      to: job.data.userEmail,
      template: "export-ready",
      data: { downloadUrl: url },
    });

    return { url, count: data.length };
  }
}
```

### Webhook Processing Pattern

```typescript
@Processor("webhook-queue")
export class WebhookProcessor {
  @Process("facebook-webhook")
  async processFacebookWebhook(job: Job<FacebookWebhookDto>) {
    const { entry } = job.data;

    for (const event of entry) {
      await this.handleFacebookEvent(event);
    }
  }
}
```
