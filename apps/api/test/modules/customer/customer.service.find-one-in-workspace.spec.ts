import { CustomerService } from '../../../src/modules/customer/services/customer.service';

// A deleted customer, or one merged into another, must not open from its old
// link (customer page, /client API, MCP get_customer).
describe('CustomerService.findOneByIdInWorkspace', () => {
    it('skips deleted and merged-away customers', async () => {
        const customerRepository = {
            findOne: jest.fn().mockResolvedValue(null),
        };
        const service = new CustomerService(
            customerRepository as any,
            {} as any,
            { get: jest.fn() } as any
        );

        await service.findOneByIdInWorkspace('cust-1', 'ws-1');

        expect(customerRepository.findOne).toHaveBeenCalledWith(
            {
                id: 'cust-1',
                workspace: 'ws-1',
                deletedAt: null,
                mergedIntoCustomerId: null,
            },
            undefined
        );
    });
});
