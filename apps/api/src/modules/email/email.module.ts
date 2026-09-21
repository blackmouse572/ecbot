import { Module, DynamicModule } from '@nestjs/common';
import { EmailService } from './services/email.service';
import { ResendProvider } from './providers/resend';
import { ConfigService } from '@nestjs/config';
import { ResendModule } from '@app/modules/resend/resend.module';
import { AwsModule } from '../aws/aws.module';
import { AwsSESProvider } from './providers/aws-ses';

@Module({})
export class EmailModule {
    static register(): DynamicModule {
        return {
            module: EmailModule,
            imports: [ResendModule, AwsModule],
            providers: [
                EmailService,
                AwsSESProvider,
                ResendProvider,
                {
                    provide: 'EMAIL_PROVIDER',
                    useFactory: (
                        configService: ConfigService,
                        awsSES: AwsSESProvider,
                        resend: ResendProvider
                    ) => {
                        const provider =
                            configService.get<string>('email.provider');
                        if (provider === 'aws-ses') return awsSES;
                        return resend;
                    },
                    inject: [ConfigService, AwsSESProvider, ResendProvider],
                },
                {
                    provide: 'IEmailService',
                    useExisting: 'EMAIL_PROVIDER',
                },
            ],
            exports: [EmailService],
        };
    }
}
