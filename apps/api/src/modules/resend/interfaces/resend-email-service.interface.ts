import { SendEmailDto, UpdateEmailDto } from '../dtos/resend-email.dto';
import { CreateEmailResponse, GetEmailResponse } from 'resend';

export interface IResendEmailService {
    sendEmail(data: SendEmailDto): Promise<CreateEmailResponse>;
    retrieveEmail(id: string): Promise<GetEmailResponse>;
    updateEmail(data: UpdateEmailDto): Promise<any>;
    cancelEmail(id: string): Promise<any>;
}
