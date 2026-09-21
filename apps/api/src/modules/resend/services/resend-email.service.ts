import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CreateEmailResponse, GetEmailResponse, Resend } from 'resend';
import { SendEmailDto, UpdateEmailDto } from '../dtos/resend-email.dto';
import { IResendEmailService } from '../interfaces/resend-email-service.interface';

@Injectable()
export class ResendEmailService implements IResendEmailService {
    private client?: Resend;

    constructor(private readonly configService: ConfigService) {}

    // new Resend('') throws "Missing API key…" at construction — build it
    // lazily so an unset key fails on first use, not at app boot.
    private get resend(): Resend {
        this.client ??= new Resend(
            this.configService.get<string>('resend.api.key')
        );
        return this.client;
    }

    async sendEmail(data: SendEmailDto): Promise<CreateEmailResponse> {
        return this.resend.emails.send({ text: '', ...data });
    }

    async retrieveEmail(id: string): Promise<GetEmailResponse> {
        return this.resend.emails.get(id);
    }

    async updateEmail(data: UpdateEmailDto): Promise<any> {
        return this.resend.emails.update({
            id: data.id,
            scheduledAt: data.scheduledAt,
        });
    }

    async cancelEmail(id: string): Promise<any> {
        return this.resend.emails.cancel(id);
    }
}
