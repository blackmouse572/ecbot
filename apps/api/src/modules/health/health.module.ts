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
        TerminusModule.forRoot({
            gracefulShutdownTimeoutMs: 1000,
        }),
    ],
})
export class HealthModule {}
