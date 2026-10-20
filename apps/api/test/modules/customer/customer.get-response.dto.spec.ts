import { plainToInstance } from 'class-transformer';
import { CustomerGetResponseDto } from '../../../src/modules/customer/dtos/response/customer.get.response.dto';

// The agent saves details with set_customer_field into `metadata`; staff
// could not see them anywhere, so the customer response carries them.
describe('CustomerGetResponseDto', () => {
    it('exposes the details the agent saved', () => {
        const dto = plainToInstance(
            CustomerGetResponseDto,
            { id: 'c-1', name: 'Lan', metadata: { address: '12 Lê Lợi' } },
            { excludeExtraneousValues: true }
        );
        expect(dto.metadata).toEqual({ address: '12 Lê Lợi' });
    });
});
