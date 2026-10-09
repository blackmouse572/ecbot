import { ApiProperty } from '@nestjs/swagger';
import { IsDefined, IsEnum, IsObject } from 'class-validator';
import { ENUM_INBOUND_EVENT_PROCESS } from '../constants/inbound-event.constant';
import { PlatformWebhookEvent } from '../interfaces/platform-adapter.interface';

export class InboundEventTaskDto {
    @ApiProperty({ enum: ENUM_INBOUND_EVENT_PROCESS, required: true })
    @IsDefined()
    @IsEnum(ENUM_INBOUND_EVENT_PROCESS)
    jobName: ENUM_INBOUND_EVENT_PROCESS;

    /**
     * The adapter-parsed event, exactly as InboundInboxService enqueued it
     * (after a JSON round-trip, so `timestamp` is an ISO string). Kept as a
     * plain object on purpose: it was produced by our own parser, and nested
     * DTO validation would reject the free-form `raw` payload.
     */
    @ApiProperty({ type: Object, required: true })
    @IsDefined()
    @IsObject()
    event: PlatformWebhookEvent;
}
