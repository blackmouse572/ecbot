import { Controller, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ApiKeySystemProtected } from '@app/modules/api-key/decorators/api-key.decorator';
import { CustomerService } from '../services/customer.service';

/**
 * Lets the agent's customer tools turn an anonymous visitor (website widget,
 * API channel) into a Customer the moment they share something to keep.
 */
@ApiTags('modules.system.customer')
@ApiKeySystemProtected()
@Controller({
    version: '1',
    path: '/conversations/:conversationId/customer',
})
export class CustomerConversationSystemController {
    constructor(private readonly customerService: CustomerService) {}

    @Post('/')
    async ensure(
        @Param('conversationId', ParseUUIDPipe) conversationId: string
    ): Promise<{ customerId: string | null }> {
        return {
            customerId:
                await this.customerService.ensureForConversation(
                    conversationId
                ),
        };
    }
}
