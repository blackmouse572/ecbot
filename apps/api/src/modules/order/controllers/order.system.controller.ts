import { ApiKeySystemProtected } from '@app/modules/api-key/decorators/api-key.decorator';
import { Body, Controller, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { OrderSystemDraftRequestDto } from '../dtos/request/order.system-draft.request.dto';
import { OrderGetResponseDto } from '../dtos/response/order.get.response.dto';
import { OrderService } from '../services/order.service';

/**
 * Back-channel for the `record_order` system tool: the bot notes an order the
 * customer confirmed in chat as a PENDING draft for staff to confirm.
 */
@ApiTags('modules.system.order')
@ApiKeySystemProtected()
@Controller({
    version: '1',
    path: '/customers/:customerId/orders',
})
export class OrderSystemController {
    constructor(private readonly orderService: OrderService) {}

    @Post('/draft')
    async draft(
        @Param('customerId', ParseUUIDPipe) customerId: string,
        @Body() dto: OrderSystemDraftRequestDto
    ): Promise<OrderGetResponseDto> {
        const order = await this.orderService.recordChatDraft(customerId, dto);
        return this.orderService.mapGet(order);
    }
}
