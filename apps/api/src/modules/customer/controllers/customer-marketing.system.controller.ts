import { ApiKeySystemProtected } from '@app/modules/api-key/decorators/api-key.decorator';
import {
    Body,
    Controller,
    HttpCode,
    HttpStatus,
    NotFoundException,
    Param,
    Post,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CUSTOMER_MARKETING_AGENT_PAUSE_DAYS } from '../constants/customer-marketing.constant';
import { CustomerMarketingSystemPermissionRequestDto } from '../dtos/request/customer-marketing.system-permission.request.dto';
import {
    ENUM_CUSTOMER_MARKETING_AGENT_ACTION,
    ENUM_CUSTOMER_MARKETING_PERMISSION,
    ENUM_MARKETING_EVENT_ACTOR,
} from '../enums/customer-marketing.enum';
import { CustomerRepository } from '../repository/repositories/customer.repository';
import { CustomerMarketingService } from '../services/customer-marketing.service';

interface PermissionResponse {
    ok: true;
    permission: ENUM_CUSTOMER_MARKETING_PERMISSION;
    /** With ASKED: the question was asked before, so the agent must not ask. */
    alreadyAsked?: boolean;
}

const DAY_MS = 86_400_000;

/**
 * Back-channel for the agent's `set_marketing_permission` tool: records the
 * one-time consent question, and the customer's answer to it.
 */
@ApiTags('modules.system.customerMarketing')
@ApiKeySystemProtected()
@Controller({
    version: '1',
    path: '/customers/:customerId/marketing',
})
export class CustomerMarketingSystemController {
    constructor(
        private readonly customerRepository: CustomerRepository,
        private readonly marketingService: CustomerMarketingService
    ) {}

    @HttpCode(HttpStatus.OK)
    @Post('/permission')
    async setPermission(
        @Param('customerId') customerId: string,
        @Body() dto: CustomerMarketingSystemPermissionRequestDto
    ): Promise<PermissionResponse> {
        const customer = await this.customerRepository.findOneById(customerId, {
            populate: ['workspace'] as any,
        });
        const workspaceId = (customer?.workspace as any)?.id;
        if (!workspaceId) {
            throw new NotFoundException({
                statusCode: 404,
                message: 'customer.error.notFound',
            });
        }
        const context = {
            actor: ENUM_MARKETING_EVENT_ACTOR.BOT,
            reason: dto.reason,
            conversationId: dto.conversationId,
        };

        if (dto.action === ENUM_CUSTOMER_MARKETING_AGENT_ACTION.ASKED) {
            const { alreadyAsked } =
                await this.marketingService.markConsentAsked(
                    customerId,
                    workspaceId,
                    context
                );
            const state = await this.marketingService.getState(
                customerId,
                workspaceId
            );
            return { ok: true, permission: state.permission, alreadyAsked };
        }

        const permission = {
            [ENUM_CUSTOMER_MARKETING_AGENT_ACTION.GRANTED]:
                ENUM_CUSTOMER_MARKETING_PERMISSION.GRANTED,
            [ENUM_CUSTOMER_MARKETING_AGENT_ACTION.PAUSED]:
                ENUM_CUSTOMER_MARKETING_PERMISSION.PAUSED,
            [ENUM_CUSTOMER_MARKETING_AGENT_ACTION.STOPPED]:
                ENUM_CUSTOMER_MARKETING_PERMISSION.STOPPED,
        }[dto.action];
        const until =
            permission === ENUM_CUSTOMER_MARKETING_PERMISSION.PAUSED
                ? new Date(
                      Date.now() +
                          (dto.pauseDays ??
                              CUSTOMER_MARKETING_AGENT_PAUSE_DAYS) *
                              DAY_MS
                  )
                : null;
        const state = await this.marketingService.setPermission(
            customerId,
            workspaceId,
            permission,
            context,
            until
        );
        return { ok: true, permission: state.permission };
    }
}
