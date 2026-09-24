import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HelperDateService } from 'src/common/helper/services/helper.date.service';
import { EmailCreateDto } from 'src/modules/email/dtos/email.create.dto';
import { EmailMobileNumberVerifiedDto } from 'src/modules/email/dtos/email.mobile-number-verified.dto';
import { EmailResetPasswordDto } from 'src/modules/email/dtos/email.reset-password.dto';
import { EmailSendDto } from 'src/modules/email/dtos/email.send.dto';
import { EmailVerificationDto } from 'src/modules/email/dtos/email.verification.dto';
import { EmailVerifiedDto } from 'src/modules/email/dtos/email.verified.dto';
import { ResendEmailService } from 'src/modules/resend/services/resend-email.service';
import { renderTemplate } from '../constraint/templates';
import { EmailAccountBlockedDto } from '../dtos/email.account-blocked.dto';
import { EmailInvitationToWorkspaceDto } from '../dtos/email.invite-to-workspace.dto';
import { EmailLowTokenBalanceDto } from '../dtos/email.low-token-balance.dto';
import { EmailSubject } from '../enum/email-subject.enum';
import { IEmailService } from '../interfaces/email.service.interface';

@Injectable()
export class ResendProvider implements IEmailService {
    private readonly logger = new Logger(ResendProvider.name);

    private readonly fromEmail: string;
    private readonly supportEmail: string;
    private readonly homeName: string;
    private readonly homeUrl: string;

    constructor(
        private readonly resendEmailService: ResendEmailService,
        private readonly configService: ConfigService,
        private readonly helperDateService: HelperDateService
    ) {
        this.fromEmail = this.configService.get<string>('email.fromEmail');
        this.supportEmail =
            this.configService.get<string>('email.supportEmail');
        this.homeName = this.configService.get<string>('home.name');
        this.homeUrl = this.configService.get<string>('home.url');
    }

    // Template management methods are not needed for Resend, so they are omitted
    private notImplemented(): never {
        throw new Error('Method not implemented.');
    }
    importChangePassword = this.notImplemented;
    getChangePassword = this.notImplemented;
    deleteChangePassword = this.notImplemented;
    importWelcome = this.notImplemented;
    getWelcome = this.notImplemented;
    deleteWelcome = this.notImplemented;
    importCreate = this.notImplemented;
    getCreate = this.notImplemented;
    deleteCreate = this.notImplemented;
    importTempPassword = this.notImplemented;
    getTempPassword = this.notImplemented;
    deleteTempPassword = this.notImplemented;
    importResetPassword = this.notImplemented;
    getResetPassword = this.notImplemented;
    deleteResetPassword = this.notImplemented;
    importVerification = this.notImplemented;
    getVerification = this.notImplemented;
    deleteVerification = this.notImplemented;
    importEmailVerified = this.notImplemented;
    getEmailVerified = this.notImplemented;
    deleteEmailVerified = this.notImplemented;
    importMobileNumberVerified = this.notImplemented;
    getMobileNumberVerified = this.notImplemented;
    deleteMobileNumberVerified = this.notImplemented;
    sendTempPassword = this.notImplemented;

    private async sendEmailTemplate<P extends object>(
        to: string,
        subject: EmailSubject,
        templateData: P
    ): Promise<boolean> {
        try {
            const html = await renderTemplate(subject, templateData);
            const res = await this.resendEmailService.sendEmail({
                from: this.fromEmail,
                to,
                subject,
                html,
            });

            if (res.error) {
                throw new Error(res.error.message);
            }
            return true;
        } catch (error: unknown) {
            this.logger.error(
                `Cannot send email to ${to} with subject ${subject}: ${error instanceof Error ? error.message : String(error)}`,
                error
            );
            return false;
        }
    }

    async sendChangePassword({ name, email }: EmailSendDto): Promise<boolean> {
        return this.sendEmailTemplate(email, EmailSubject.ChangePassword, {
            name,
            supportEmail: this.supportEmail,
            homeUrl: this.homeUrl,
            homeName: this.homeName,
        });
    }

    async sendWelcome({ name, email }: EmailSendDto): Promise<boolean> {
        return this.sendEmailTemplate(email, EmailSubject.Welcome, {
            email,
            homeName: this.homeName,
            homeUrl: this.homeUrl,
            name,
            supportEmail: this.supportEmail,
        });
    }

    async sendCreate(
        { name, email }: EmailSendDto,
        { password: passwordString, passwordExpiredAt }: EmailCreateDto
    ): Promise<boolean> {
        return this.sendEmailTemplate(email, EmailSubject.CreateAccount, {
            password: passwordString,
            passwordExpiredAt:
                this.helperDateService.formatToRFC2822(passwordExpiredAt),
            homeName: this.homeName,
            homeUrl: this.homeUrl,
            name,
            supportEmail: this.supportEmail,
        });
    }

    async sendResetPassword(
        { name, email }: EmailSendDto,
        { expiredDate, url, otp }: EmailResetPasswordDto
    ): Promise<boolean> {
        return this.sendEmailTemplate(email, EmailSubject.ResetPassword, {
            name,
            url,
            otp,
            expiredDate: this.helperDateService.formatToRFC2822(expiredDate),
            supportEmail: this.supportEmail,
            homeUrl: this.homeUrl,
            homeName: this.homeName,
        });
    }

    async sendVerification(
        { name, email }: EmailSendDto,
        { expiredAt, reference, otp }: EmailVerificationDto
    ): Promise<boolean> {
        return this.sendEmailTemplate(email, EmailSubject.EmailVerification, {
            name,
            otp,
            expiredAt: this.helperDateService.formatToRFC2822(expiredAt),
            reference,
            supportEmail: this.supportEmail,
            homeUrl: this.homeUrl,
            homeName: this.homeName,
        });
    }

    async sendEmailVerified(
        { name, email }: EmailSendDto,
        { reference }: EmailVerifiedDto
    ): Promise<boolean> {
        return this.sendEmailTemplate(email, EmailSubject.EmailVerified, {
            name,
            otp: 'verified',
            expiredAt: this.helperDateService.formatToRFC2822(new Date()),
            reference,
            supportEmail: this.supportEmail,
            homeUrl: this.homeUrl,
            homeName: this.homeName,
        });
    }

    async sendMobileNumberVerified(
        { name, email }: EmailSendDto,
        { reference, mobileNumber }: EmailMobileNumberVerifiedDto
    ): Promise<boolean> {
        return this.sendEmailTemplate(
            email,
            EmailSubject.MobileNumberVerified,
            {
                name,
                mobileNumber,
                reference,
                supportEmail: this.supportEmail,
                homeUrl: this.homeUrl,
                homeName: this.homeName,
            }
        );
    }

    async sendInvitationToWorkSpace(
        { email }: EmailSendDto,
        { invitationLink }: EmailInvitationToWorkspaceDto
    ): Promise<boolean> {
        return this.sendEmailTemplate(email, EmailSubject.InviteToWorkSpace, {
            email,
            homeName: this.homeName,
            homeUrl: this.homeUrl,
            supportEmail: this.supportEmail,
            invitationLink,
        });
    }

    async sendAccountBlocked(
        { name, email }: EmailSendDto,
        { accountName, reconnectUrl }: EmailAccountBlockedDto
    ): Promise<boolean> {
        return this.sendEmailTemplate(email, EmailSubject.AccountBlocked, {
            name,
            accountName,
            reconnectUrl: `${this.homeUrl}${reconnectUrl}`,
            supportEmail: this.supportEmail,
            homeUrl: this.homeUrl,
            homeName: this.homeName,
        });
    }

    async sendAccountBanned({ name, email }: EmailSendDto): Promise<boolean> {
        return this.sendEmailTemplate(email, EmailSubject.AccountBanned, {
            name,
            supportEmail: this.supportEmail,
            homeUrl: this.homeUrl,
            homeName: this.homeName,
        });
    }

    async sendLowTokenBalance(
        { name, email }: EmailSendDto,
        {
            workspaceName,
            usedPercent,
            periodEnd,
            usageUrl,
        }: EmailLowTokenBalanceDto
    ): Promise<boolean> {
        return this.sendEmailTemplate(email, EmailSubject.LowTokenBalance, {
            name,
            workspaceName,
            usedPercent,
            periodEnd: this.helperDateService.formatToRFC2822(periodEnd),
            usageUrl: `${this.homeUrl}${usageUrl}`,
            supportEmail: this.supportEmail,
            homeUrl: this.homeUrl,
            homeName: this.homeName,
        });
    }
}
