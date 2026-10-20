import { plainToInstance } from 'class-transformer';
import { CustomerGetResponseDto } from '../../../src/modules/customer/dtos/response/customer.get.response.dto';
import { CustomerWorkspaceGetResponseDto } from '../../../src/modules/customer/dtos/response/customer.workspace-get.response.dto';

// The agent saves details with set_customer_field into `metadata`. Staff see
// them in the workspace app; third-party API keys (/client) do not.
describe('customer get response DTOs', () => {
    const customer = {
        id: 'c-1',
        name: 'Lan',
        metadata: { address: '12 Lê Lợi' },
    };

    it('shows staff the details the agent saved', () => {
        const dto = plainToInstance(CustomerWorkspaceGetResponseDto, customer, {
            excludeExtraneousValues: true,
        });
        expect(dto.metadata).toEqual({ address: '12 Lê Lợi' });
    });

    it('keeps them out of the response API keys read', () => {
        const dto = plainToInstance(CustomerGetResponseDto, customer, {
            excludeExtraneousValues: true,
        });
        expect(dto).not.toHaveProperty('metadata');
        expect(dto.name).toBe('Lan');
    });
});
