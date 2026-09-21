import { Inject, Injectable } from '@nestjs/common';
import { EmailCreateDto } from 'src/modules/email/dtos/email.create.dto';
import { EmailMobileNumberVerifiedDto } from 'src/modules/email/dtos/email.mobile-number-verified.dto';
import { EmailResetPasswordDto } from 'src/modules/email/dtos/email.reset-password.dto';
import { EmailSendDto } from 'src/modules/email/dtos/email.send.dto';
import { EmailTempPasswordDto } from 'src/modules/email/dtos/email.temp-password.dto';
import { EmailVerificationDto } from 'src/modules/email/dtos/email.verification.dto';
import { EmailVerifiedDto } from 'src/modules/email/dtos/email.verified.dto';
import { IEmailService } from 'src/modules/email/interfaces/email.service.interface';
import { EmailAccountBlockedDto } from '../dtos/email.account-blocked.dto';
import { EmailInvitationToWorkspaceDto } from '../dtos/email.invite-to-workspace.dto';
import { EmailLowTokenBalanceDto } from '../dtos/email.low-token-balance.dto';

@Injectable()
export class EmailService implements IEmailService {
    constructor(
        @Inject('IEmailService') private readonly emailProvider: IEmailService
    ) {}

    private delegate<T extends keyof IEmailService>(
        method: T,
        ...args: Parameters<IEmailService[T]>
    ): ReturnType<IEmailService[T]> {
        // @ts-expect-error: Dynamic method invocation on IEmailService interface
        return this.emailProvider[method](...args);
    }

    importChangePassword = () => this.delegate('importChangePassword');

    getChangePassword = () => this.delegate('getChangePassword');

    deleteChangePassword = () => this.delegate('deleteChangePassword');

    sendChangePassword = (dto: EmailSendDto) =>
        this.delegate('sendChangePassword', dto);

    importWelcome = () => this.delegate('importWelcome');

    getWelcome = () => this.delegate('getWelcome');

    deleteWelcome = () => this.delegate('deleteWelcome');

    sendWelcome = (dto: EmailSendDto) => this.delegate('sendWelcome', dto);

    importCreate = () => this.delegate('importCreate');

    getCreate = () => this.delegate('getCreate');

    deleteCreate = () => this.delegate('deleteCreate');

    sendCreate = (dto: EmailSendDto, createDto: EmailCreateDto) =>
        this.delegate('sendCreate', dto, createDto);

    importTempPassword = () => this.delegate('importTempPassword');

    getTempPassword = () => this.delegate('getTempPassword');

    deleteTempPassword = () => this.delegate('deleteTempPassword');

    sendTempPassword = (dto: EmailSendDto, tempDto: EmailTempPasswordDto) =>
        this.delegate('sendTempPassword', dto, tempDto);

    importResetPassword = () => this.delegate('importResetPassword');

    getResetPassword = () => this.delegate('getResetPassword');

    deleteResetPassword = () => this.delegate('deleteResetPassword');

    sendResetPassword = (dto: EmailSendDto, resetDto: EmailResetPasswordDto) =>
        this.delegate('sendResetPassword', dto, resetDto);

    importVerification = () => this.delegate('importVerification');

    getVerification = () => this.delegate('getVerification');

    deleteVerification = () => this.delegate('deleteVerification');

    sendVerification = (
        dto: EmailSendDto,
        verificationDto: EmailVerificationDto
    ) => this.delegate('sendVerification', dto, verificationDto);

    importEmailVerified = () => this.delegate('importEmailVerified');

    getEmailVerified = () => this.delegate('getEmailVerified');

    deleteEmailVerified = () => this.delegate('deleteEmailVerified');

    sendEmailVerified = (dto: EmailSendDto, verifiedDto: EmailVerifiedDto) =>
        this.delegate('sendEmailVerified', dto, verifiedDto);

    importMobileNumberVerified = () =>
        this.delegate('importMobileNumberVerified');

    getMobileNumberVerified = () => this.delegate('getMobileNumberVerified');

    deleteMobileNumberVerified = () =>
        this.delegate('deleteMobileNumberVerified');

    sendMobileNumberVerified = (
        dto: EmailSendDto,
        mobileDto: EmailMobileNumberVerifiedDto
    ) => this.delegate('sendMobileNumberVerified', dto, mobileDto);

    sendInvitationToWorkSpace = (
        dto: EmailSendDto,
        invitationData: EmailInvitationToWorkspaceDto
    ) => this.delegate('sendInvitationToWorkSpace', dto, invitationData);

    sendAccountBlocked = (dto: EmailSendDto, data: EmailAccountBlockedDto) =>
        this.delegate('sendAccountBlocked', dto, data);

    sendAccountBanned = (dto: EmailSendDto) =>
        this.delegate('sendAccountBanned', dto);

    sendLowTokenBalance = (dto: EmailSendDto, data: EmailLowTokenBalanceDto) =>
        this.delegate('sendLowTokenBalance', dto, data);
}
