import { Body, Controller, Headers, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ApiKeyCloudTasksProtected } from '@app/modules/api-key/decorators/api-key.decorator';
import { RequestTimeout } from 'src/common/request/decorators/request.decorator';
import { Response } from 'src/common/response/decorators/response.decorator';
import { IResponse } from 'src/common/response/interfaces/response.interface';
import { ConversationMemoryTaskHandleDoc } from '../docs/conversation-memory.task.doc';
import { ConversationMemoryTaskDto } from '../dtos/conversation-memory.task.dto';
import { ConversationMemoryTaskService } from '../services/conversation-memory-task.service';

@ApiTags('modules.tasks.conversation-memory')
@Controller({ version: '1', path: '/tasks' })
export class ConversationMemoryTaskController {
    constructor(private readonly taskService: ConversationMemoryTaskService) {}

    @ConversationMemoryTaskHandleDoc()
    @Response('conversationMemory.task.processed')
    @ApiKeyCloudTasksProtected()
    @RequestTimeout('120s')
    @Post('/conversation-memory')
    async handle(
        @Body() dto: ConversationMemoryTaskDto,
        @Headers('x-cloudtasks-taskretrycount') rawRetryCount?: string
    ): Promise<IResponse> {
        const retryCount = Number(rawRetryCount);
        await this.taskService.handle(
            dto,
            Number.isInteger(retryCount) && retryCount >= 0 ? retryCount : 0
        );
        return {};
    }
}
