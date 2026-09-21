import { Body, Controller, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ApiKeySystemProtected } from '@app/modules/api-key/decorators/api-key.decorator';
import { RequestTimeout } from 'src/common/request/decorators/request.decorator';
import { Response } from 'src/common/response/decorators/response.decorator';
import { IResponse } from 'src/common/response/interfaces/response.interface';
import { SmsTaskHandleDoc } from 'src/modules/sms/docs/sms.task.doc';
import { SmsTaskDto } from 'src/modules/sms/dtos/sms.task.dto';
import { ENUM_SEND_SMS_PROCESS } from 'src/modules/sms/enums/sms.enum';
import { SmsService } from 'src/modules/sms/services/sms.service';

@ApiTags('modules.tasks.sms')
@Controller({ version: '1', path: '/tasks' })
export class SmsTaskController {
    constructor(private readonly smsService: SmsService) {}

    @SmsTaskHandleDoc()
    @Response('sms.task.processed')
    @ApiKeySystemProtected()
    @RequestTimeout('300s')
    @Post('/sms')
    async handle(@Body() dto: SmsTaskDto): Promise<IResponse> {
        switch (dto.jobName) {
            case ENUM_SEND_SMS_PROCESS.VERIFICATION:
                await this.smsService.sendVerification(dto.send, dto.data);
                break;
        }

        return {};
    }
}
