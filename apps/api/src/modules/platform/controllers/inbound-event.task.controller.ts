import { Body, Controller, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ApiKeySystemProtected } from '@app/modules/api-key/decorators/api-key.decorator';
import { RequestTimeout } from 'src/common/request/decorators/request.decorator';
import { Response } from 'src/common/response/decorators/response.decorator';
import { IResponse } from 'src/common/response/interfaces/response.interface';
import { InboundEventTaskHandleDoc } from '../docs/inbound-event.task.doc';
import { InboundEventTaskDto } from '../dtos/inbound-event.task.dto';
import {
    ENUM_INBOUND_EVENT_PROCESS,
    INBOUND_EVENT_QUEUE,
} from '../constants/inbound-event.constant';
import { MessageProcessorService } from '../services/message-processor.service';

/**
 * Drains the Inbound Inbox (ADR-0008): runs each durable inbound event through
 * the Turn pipeline. A thrown Turn becomes a 5xx, and Cloud Tasks retries the
 * task with the queue's backoff; `process()` is idempotent (dedupe claim,
 * upsertByExternalId), so at-least-once delivery is safe.
 */
@ApiTags('modules.tasks.inboundEvent')
@Controller({ version: '1', path: '/tasks' })
export class InboundEventTaskController {
    constructor(private readonly messageProcessor: MessageProcessorService) {}

    @InboundEventTaskHandleDoc()
    @Response('inboundEvent.task.processed')
    @ApiKeySystemProtected()
    @RequestTimeout('300s')
    @Post(`/${INBOUND_EVENT_QUEUE}`)
    async handle(@Body() dto: InboundEventTaskDto): Promise<IResponse> {
        switch (dto.jobName) {
            case ENUM_INBOUND_EVENT_PROCESS.INGEST:
                await this.messageProcessor.process(dto.event);
                break;
        }

        return {};
    }
}
