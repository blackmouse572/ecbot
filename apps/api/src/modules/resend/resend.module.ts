import { Module } from '@nestjs/common';
import { ResendEmailService } from './services/resend-email.service';

@Module({
    providers: [ResendEmailService],
    exports: [ResendEmailService],
})
export class ResendModule {}
