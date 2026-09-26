import { ConversationService } from '@app/modules/conversation/services/conversation.service';
import { ConversationRepository } from '@app/modules/conversation/repository/repositories/conversation.repository';
import {
    BadRequestException,
    Body,
    Controller,
    Logger,
    NotFoundException,
    Param,
    Post,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ApiKeySystemProtected } from '@app/modules/api-key/decorators/api-key.decorator';
import { CustomerTagSystemApplyRequestDto } from '../dtos/request/customer-tag.system-apply.request.dto';
import { CustomerTagSystemRemoveRequestDto } from '../dtos/request/customer-tag.system-remove.request.dto';
import { CustomerRepository } from '../repository/repositories/customer.repository';
import { CustomerTagAssignmentService } from '../services/customer-tag-assignment.service';
import { CustomerTagService } from '../services/customer-tag.service';

interface ApplyResponse {
    ok: true;
    triggeredHandoff: boolean;
}

interface RemoveResponse {
    ok: true;
}

/**
 * Back-channel for `applyCustomerTag` / `removeCustomerTag` system tools.
 *
 * Apply path: resolves the tag by NAME within the customer's workspace, applies
 * idempotently, and — if the tag is `triggersHandoff` — reuses the existing
 * Phase 3 escalation path on the supplied conversation. The agent supplies the
 * conversation id via `chat_session_id`; without it we cannot pick a single
 * conversation to escalate, so handoff is skipped (apply still succeeds).
 */
@ApiTags('modules.system.customerTag')
@ApiKeySystemProtected()
@Controller({
    version: '1',
    path: '/customers/:customerId/tags',
})
export class CustomerTagSystemController {
    private readonly logger = new Logger(CustomerTagSystemController.name);

    constructor(
        private readonly customerRepository: CustomerRepository,
        private readonly customerTagService: CustomerTagService,
        private readonly customerTagAssignmentService: CustomerTagAssignmentService,
        private readonly conversationService: ConversationService,
        private readonly conversationRepository: ConversationRepository
    ) {}

    @Post('/apply')
    async apply(
        @Param('customerId') customerId: string,
        @Body() dto: CustomerTagSystemApplyRequestDto
    ): Promise<ApplyResponse> {
        const customer = await this.customerRepository.findOneById(customerId, {
            populate: ['workspace'] as any,
        });
        if (!customer) {
            throw new NotFoundException({
                message: 'customer.error.notFound',
                statusCode: 404,
            });
        }
        const workspaceId = (customer.workspace as any)?.id;
        if (!workspaceId) {
            throw new BadRequestException({
                message: 'customer.error.workspaceUnknown',
                statusCode: 400,
            });
        }

        const tag = await this.customerTagService.findOneByWorkspaceAndName(
            workspaceId,
            dto.tagName
        );
        if (!tag) {
            throw new NotFoundException({
                message: 'customerTag.error.notFound',
                statusCode: 404,
            });
        }

        await this.customerTagAssignmentService.apply(customerId, tag.id);

        let triggeredHandoff = false;
        if (tag.triggersHandoff) {
            if (!dto.conversationId) {
                this.logger.warn(
                    `Tag ${tag.name} triggers handoff but no conversationId supplied for customer ${customerId}; skipping handoff`
                );
            } else {
                const conversation =
                    await this.conversationRepository.findOneById(
                        dto.conversationId,
                        { populate: ['chatbot'] as any }
                    );
                if (!conversation) {
                    this.logger.warn(
                        `Tag ${tag.name} triggers handoff but conversation ${dto.conversationId} not found`
                    );
                } else {
                    const chatbot: any = (conversation as any).chatbot;
                    await this.conversationService.triggerHandoff(
                        conversation,
                        workspaceId,
                        'tag_trigger',
                        chatbot?.handoffMessage
                    );
                    triggeredHandoff = true;
                }
            }
        }

        return { ok: true, triggeredHandoff };
    }

    @Post('/remove')
    async remove(
        @Param('customerId') customerId: string,
        @Body() dto: CustomerTagSystemRemoveRequestDto
    ): Promise<RemoveResponse> {
        const customer = await this.customerRepository.findOneById(customerId, {
            populate: ['workspace'] as any,
        });
        if (!customer) {
            throw new NotFoundException({
                message: 'customer.error.notFound',
                statusCode: 404,
            });
        }
        const workspaceId = (customer.workspace as any)?.id;
        if (!workspaceId) {
            throw new BadRequestException({
                message: 'customer.error.workspaceUnknown',
                statusCode: 400,
            });
        }
        const tag = await this.customerTagService.findOneByWorkspaceAndName(
            workspaceId,
            dto.tagName
        );
        if (!tag) {
            // No-op: nothing to remove. Idempotent.
            return { ok: true };
        }
        await this.customerTagAssignmentService.remove(customerId, tag.id);
        return { ok: true };
    }
}
