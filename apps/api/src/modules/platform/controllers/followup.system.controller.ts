import {
    Body,
    Controller,
    Delete,
    Get,
    Param,
    Post,
    Query,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ApiKeySystemProtected } from '@app/modules/api-key/decorators/api-key.decorator';
import { FollowupPendingResponseDto } from '../dtos/response/followup.pending.response.dto';
import { FollowupScheduleRequestDto } from '../dtos/request/followup.schedule.request.dto';
import { FollowupService } from '../services/followup.service';

/**
 * Back-channel for the agent's proactive-followup tools. apps/ai POSTs here to
 * schedule a delayed Cloud Task, GETs to list a conversation's pending
 * followups, and DELETEs to cancel one. Scheduling/cancel logic lives here so
 * the Python side stays a thin tool runner.
 */
@ApiTags('modules.system.followup')
@Controller({ version: '1', path: '/followups' })
export class FollowupSystemController {
    constructor(private readonly followupService: FollowupService) {}

    @Post()
    @ApiKeySystemProtected()
    async schedule(
        @Body() dto: FollowupScheduleRequestDto
    ): Promise<{ followupId: string }> {
        const followupId = await this.followupService.schedule(
            {
                conversationId: dto.conversationId,
                chatbotId: dto.chatbotId,
                userId: dto.userId,
                providerId: dto.providerId,
                customerId: dto.customerId ?? '',
                contactPointId: dto.contactPointId ?? '',
                prompt: dto.prompt,
                reason: dto.reason,
                triggerMessageId: dto.triggerMessageId,
            },
            dto.delayMinutes
        );
        return { followupId };
    }

    @Get()
    @ApiKeySystemProtected()
    async list(
        @Query('conversationId') conversationId: string
    ): Promise<FollowupPendingResponseDto[]> {
        const followups =
            await this.followupService.findScheduledByConversation(
                conversationId
            );

        return this.followupService.mapPending(followups);
    }

    @Delete(':id')
    @ApiKeySystemProtected()
    async cancel(@Param('id') id: string): Promise<{ cancelled: boolean }> {
        return { cancelled: await this.followupService.cancel(id) };
    }
}
