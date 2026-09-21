import { Body, Controller, Param, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ApiKeySystemProtected } from '@app/modules/api-key/decorators/api-key.decorator';
import { CustomerSystemSetFieldRequestDto } from '../dtos/request/customer.system-set-field.request.dto';
import { CustomerSystemUpdateProfileRequestDto } from '../dtos/request/customer.system-update-profile.request.dto';
import { CustomerService } from '../services/customer.service';

/**
 * Back-channel for the agent's customer-aware system tools. apps/ai POSTs here
 * over HTTP — we keep all permission and event-emit logic in apps/api so the
 * Python side stays a thin tool runner.
 */
@ApiTags('modules.system.customer')
@ApiKeySystemProtected()
@Controller({
    version: '1',
    path: '/system/customers/:customerId',
})
export class CustomerSystemController {
    constructor(private readonly customerService: CustomerService) {}

    @Post('/fields')
    async setField(
        @Param('customerId') customerId: string,
        @Body() dto: CustomerSystemSetFieldRequestDto
    ): Promise<{ ok: true }> {
        await this.customerService.setMetadataField(
            customerId,
            dto.key,
            dto.value
        );
        return { ok: true };
    }

    @Post('/profile')
    async updateProfile(
        @Param('customerId') customerId: string,
        @Body() dto: CustomerSystemUpdateProfileRequestDto
    ): Promise<{ ok: true }> {
        await this.customerService.updateProfileFromSystemTool(customerId, {
            name: dto.name,
            phone: dto.phone,
            email: dto.email,
            language: dto.language,
        });
        return { ok: true };
    }
}
