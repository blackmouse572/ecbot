import { ApiKeyCloudTasksProtected } from '@app/modules/api-key/decorators/api-key.decorator';
import { Body, Controller, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { RequestTimeout } from 'src/common/request/decorators/request.decorator';
import { Response } from 'src/common/response/decorators/response.decorator';
import { IResponse } from 'src/common/response/interfaces/response.interface';
import { CUSTOMER_MARKETING_BACKFILL_QUEUE } from '../constants/customer-marketing-backfill.constant';
import { CustomerMarketingBackfillTaskHandleDoc } from '../docs/customer-marketing-backfill.doc';
import { CustomerMarketingBackfillTaskDto } from '../dtos/customer-marketing-backfill.task.dto';
import { CustomerMarketingBackfillService } from '../services/customer-marketing-backfill.service';

@ApiTags('modules.tasks.customer-marketing-backfill')
@Controller({ version: '1', path: '/tasks' })
export class CustomerMarketingBackfillTaskController {
    constructor(
        private readonly backfillService: CustomerMarketingBackfillService
    ) {}

    @CustomerMarketingBackfillTaskHandleDoc()
    @Response('customerMarketing.backfill.processed')
    @ApiKeyCloudTasksProtected()
    @RequestTimeout('300s')
    @Post(`/${CUSTOMER_MARKETING_BACKFILL_QUEUE}`)
    async handle(
        @Body() dto: CustomerMarketingBackfillTaskDto
    ): Promise<IResponse> {
        await this.backfillService.runBatch(dto.runId);
        return {};
    }
}
