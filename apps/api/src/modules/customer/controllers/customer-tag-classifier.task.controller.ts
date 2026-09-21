import { Body, Controller, Headers, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ApiKeySystemProtected } from '@app/modules/api-key/decorators/api-key.decorator';
import { RequestTimeout } from 'src/common/request/decorators/request.decorator';
import { Response } from 'src/common/response/decorators/response.decorator';
import { IResponse } from 'src/common/response/interfaces/response.interface';
import { CustomerTagClassifierTaskHandleDoc } from '../docs/customer-tag-classifier.task.doc';
import { CustomerTagClassifierTaskDto } from '../dtos/customer-tag-classifier.task.dto';
import { CustomerTagClassifierTaskService } from '../services/customer-tag-classifier-task.service';

@ApiTags('modules.tasks.customer-tag-classifier')
@Controller({ version: '1', path: '/tasks' })
export class CustomerTagClassifierTaskController {
    constructor(
        private readonly taskService: CustomerTagClassifierTaskService
    ) {}

    @CustomerTagClassifierTaskHandleDoc()
    @Response('customerTagClassifier.task.processed')
    @ApiKeySystemProtected()
    @RequestTimeout('300s')
    @Post('/customer-tag-classifier')
    async handle(
        @Body() dto: CustomerTagClassifierTaskDto,
        @Headers() headers: Record<string, string | undefined>
    ): Promise<IResponse> {
        const rawRetryCount = headers?.['x-cloudtasks-taskretrycount'];
        const parsedRetryCount =
            typeof rawRetryCount === 'string' ? Number(rawRetryCount) : NaN;
        const retryCount =
            Number.isInteger(parsedRetryCount) && parsedRetryCount >= 0
                ? parsedRetryCount
                : 0;

        await this.taskService.handle(dto, retryCount);

        return {};
    }
}
