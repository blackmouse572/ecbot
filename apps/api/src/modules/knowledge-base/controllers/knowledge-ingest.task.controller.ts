import { Body, Controller, Headers, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ApiKeySystemProtected } from '@app/modules/api-key/decorators/api-key.decorator';
import { RequestTimeout } from 'src/common/request/decorators/request.decorator';
import { Response } from 'src/common/response/decorators/response.decorator';
import { IResponse } from 'src/common/response/interfaces/response.interface';
import { KnowledgeIngestTaskHandleDoc } from '../docs/knowledge-ingest.task.doc';
import { KnowledgeIngestTaskDto } from '../dtos/knowledge-ingest.task.dto';
import { KnowledgeIngestTaskService } from '../services/knowledge-ingest-task.service';

@ApiTags('modules.tasks.knowledge-ingest')
@Controller({ version: '1', path: '/tasks' })
export class KnowledgeIngestTaskController {
    constructor(private readonly taskService: KnowledgeIngestTaskService) {}

    @KnowledgeIngestTaskHandleDoc()
    @Response('knowledgeBase.task.processed')
    @ApiKeySystemProtected()
    @RequestTimeout('300s')
    @Post('/knowledge-ingest')
    async handle(
        @Body() dto: KnowledgeIngestTaskDto,
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
