import { Body, Controller, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ApiKeySystemProtected } from '@app/modules/api-key/decorators/api-key.decorator';
import { Response } from 'src/common/response/decorators/response.decorator';
import { IResponse } from 'src/common/response/interfaces/response.interface';
import { EmailTaskHandleDoc } from 'src/modules/email/docs/email.task.doc';
import { EmailTaskDto } from 'src/modules/email/dtos/email.task.dto';
import { ENUM_SEND_EMAIL_PROCESS } from 'src/modules/email/enums/email.enum';
import { EmailService } from 'src/modules/email/services/email.service';

@ApiTags('modules.tasks.email')
@Controller({ version: '1', path: '/tasks' })
export class EmailTaskController {
    constructor(private readonly emailService: EmailService) {}

    @EmailTaskHandleDoc()
    @Response('email.task.processed')
    @ApiKeySystemProtected()
    @Post('/email')
    async handle(@Body() dto: EmailTaskDto): Promise<IResponse> {
        switch (dto.jobName) {
            case ENUM_SEND_EMAIL_PROCESS.WELCOME:
                await this.emailService.sendWelcome(dto.send);
                break;
            case ENUM_SEND_EMAIL_PROCESS.CHANGE_PASSWORD:
                await this.emailService.sendChangePassword(dto.send);
                break;
            case ENUM_SEND_EMAIL_PROCESS.TEMPORARY_PASSWORD:
                await this.emailService.sendTempPassword(
                    dto.send,
                    dto.data as any
                );
                break;
            case ENUM_SEND_EMAIL_PROCESS.CREATE:
                await this.emailService.sendCreate(dto.send, dto.data as any);
                break;
            case ENUM_SEND_EMAIL_PROCESS.RESET_PASSWORD:
                await this.emailService.sendResetPassword(
                    dto.send,
                    dto.data as any
                );
                break;
            case ENUM_SEND_EMAIL_PROCESS.VERIFICATION:
                await this.emailService.sendVerification(
                    dto.send,
                    dto.data as any
                );
                break;
            case ENUM_SEND_EMAIL_PROCESS.EMAIL_VERIFIED:
                await this.emailService.sendEmailVerified(
                    dto.send,
                    dto.data as any
                );
                break;
            case ENUM_SEND_EMAIL_PROCESS.MOBILE_NUMBER_VERIFIED:
                await this.emailService.sendMobileNumberVerified(
                    dto.send,
                    dto.data as any
                );
                break;
            case ENUM_SEND_EMAIL_PROCESS.INVITE_TO_WORKSPACE:
                await this.emailService.sendInvitationToWorkSpace(
                    dto.send,
                    dto.data as any
                );
                break;
            case ENUM_SEND_EMAIL_PROCESS.ACCOUNT_BLOCKED:
                await this.emailService.sendAccountBlocked(
                    dto.send,
                    dto.data as any
                );
                break;
            case ENUM_SEND_EMAIL_PROCESS.ACCOUNT_BANNED:
                await this.emailService.sendAccountBanned(dto.send);
                break;
        }

        return {};
    }
}
