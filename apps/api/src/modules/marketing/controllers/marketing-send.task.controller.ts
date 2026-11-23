import { ApiKeyCloudTasksProtected } from '@app/modules/api-key/decorators/api-key.decorator';
import { Body, Controller, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { RequestTimeout } from 'src/common/request/decorators/request.decorator';
import { Response } from 'src/common/response/decorators/response.decorator';
import { IResponse } from 'src/common/response/interfaces/response.interface';
import { MARKETING_SEND_QUEUE } from '../constants/marketing-send.constant';
import { MarketingSendTaskHandleDoc } from '../docs/marketing-send.task.doc';
import { MarketingSendTaskDto } from '../dtos/marketing-send.task.dto';
import { MarketingSendService } from '../services/marketing-send.service';

@ApiTags('modules.tasks.marketing-send')
@Controller({ version: '1', path: '/tasks' })
export class MarketingSendTaskController {
    constructor(private readonly sendService: MarketingSendService) {}

    @MarketingSendTaskHandleDoc()
    @Response('marketingSend.task.processed')
    @ApiKeyCloudTasksProtected()
    @RequestTimeout('60s')
    @Post(`/${MARKETING_SEND_QUEUE}`)
    async handle(@Body() dto: MarketingSendTaskDto): Promise<IResponse> {
        await this.sendService.deliver(dto.messageId);
        return {};
    }
}
