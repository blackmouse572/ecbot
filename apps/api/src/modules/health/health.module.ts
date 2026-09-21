import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { AwsModule } from 'src/modules/aws/aws.module';
import { HealthAwsPinpointIndicator } from 'src/modules/health/indicators/health.aws-pinpoint.indicator';
import {
    HealthAwsS3PublicBucketIndicator,
    HealthAwsS3PrivateBucketIndicator,
} from 'src/modules/health/indicators/health.aws-s3.indicator';
import { HealthAwsSESIndicator } from 'src/modules/health/indicators/health.aws-ses.indicator';
import { HealthRedisIndicator } from 'src/modules/health/indicators/health.redis.indicator';
import { INBOUND_EVENT_QUEUE } from 'src/modules/platform/constants/inbound-event.constant';

@Module({
    providers: [
        HealthAwsS3PublicBucketIndicator,
        HealthAwsS3PrivateBucketIndicator,
        HealthAwsPinpointIndicator,
        HealthAwsSESIndicator,
        HealthRedisIndicator,
    ],
    exports: [
        HealthAwsS3PublicBucketIndicator,
        HealthAwsS3PrivateBucketIndicator,
        HealthAwsPinpointIndicator,
        HealthAwsSESIndicator,
        HealthRedisIndicator,
        TerminusModule,
    ],
    imports: [
        AwsModule,
        // Reuse the Inbound Inbox queue's Redis connection for the readiness ping.
        BullModule.registerQueue({ name: INBOUND_EVENT_QUEUE }),
        TerminusModule.forRoot({
            gracefulShutdownTimeoutMs: 1000,
        }),
    ],
})
export class HealthModule {}
