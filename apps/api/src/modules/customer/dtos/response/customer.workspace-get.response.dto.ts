import { ApiPropertyOptional } from '@nestjs/swagger';
import { Expose } from 'class-transformer';
import { CustomerGetResponseDto } from './customer.get.response.dto';

/** The customer as staff see it in the workspace app. Agent-saved details
 *  stay out of the /client response that third-party API keys read. */
export class CustomerWorkspaceGetResponseDto extends CustomerGetResponseDto {
    @Expose()
    @ApiPropertyOptional({
        type: 'object',
        additionalProperties: { type: 'string' },
        description:
            'Details the agent saved about the customer (set_customer_field), by key.',
    })
    metadata?: Record<string, string>;
}
