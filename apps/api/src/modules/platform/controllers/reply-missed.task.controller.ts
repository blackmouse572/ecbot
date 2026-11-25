import { Body, Controller, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ApiKeyCloudTasksProtected } from '@app/modules/api-key/decorators/api-key.decorator';
import { Response } from 'src/common/response/decorators/response.decorator';
import { IResponse } from 'src/common/response/interfaces/response.interface';
import {
    ENUM_REPLY_MISSED_PROCESS,
    REPLY_MISSED_QUEUE,
} from '../constants/reply-missed.constant';
import { ReplyMissedTaskHandleDoc } from '../docs/reply-missed.task.doc';
import { ReplyMissedTaskDto } from '../dtos/reply-missed.task.dto';
import { ReplyMissedAlertService } from '../services/reply-missed-alert.service';

/**
 * Delayed per-message backstop for a reply turn that never ran. Scheduled by
 * `ReplyMissedAlertService.scheduleCheck` right after the inbound row is
 * saved; a thrown handler returns 5xx so Cloud Tasks retries, and `check()`
 * is idempotent (read-only query plus a Redis claim).
 */
@ApiTags('modules.tasks.replyMissed')
@Controller({ version: '1', path: '/tasks' })
export class ReplyMissedTaskController {
    constructor(private readonly replyMisses: ReplyMissedAlertService) {}

    @ReplyMissedTaskHandleDoc()
    @Response('replyMissed.task.processed')
    @ApiKeyCloudTasksProtected()
    @Post(`/${REPLY_MISSED_QUEUE}`)
    async handle(@Body() dto: ReplyMissedTaskDto): Promise<IResponse> {
        switch (dto.jobName) {
            case ENUM_REPLY_MISSED_PROCESS.CHECK:
                await this.replyMisses.check(dto.messageId);
                break;
        }

        return {};
    }
}
