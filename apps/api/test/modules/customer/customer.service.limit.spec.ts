import { ENUM_ACCOUNT_TYPE } from '../../../src/modules/account/enums/account.enum';
import { CustomerService } from '../../../src/modules/customer/services/customer.service';

describe('CustomerService.resolveContactPoint customer limit', () => {
    const customerRepository = {
        create: jest.fn(),
        countByWorkspace: jest.fn(),
    };
    const contactPointRepository = {
        findByWorkspacePlatformSender: jest.fn(),
        create: jest.fn(),
    };
    const limit = { getCustomerLimit: jest.fn() };
    const params = {
        workspaceId: 'ws-1',
        platform: ENUM_ACCOUNT_TYPE.FACEBOOK_PAGE,
        externalSenderId: 'sender-1',
    };

    const build = (withLimit = true) =>
        new CustomerService(
            customerRepository as any,
            contactPointRepository as any,
            {} as any,
            withLimit ? (limit as any) : undefined
        );

    beforeEach(() => {
        jest.clearAllMocks();
        contactPointRepository.findByWorkspacePlatformSender.mockResolvedValue(
            null
        );
        customerRepository.create.mockResolvedValue({ id: 'cust-new' });
        contactPointRepository.create.mockResolvedValue({ id: 'cp-new' });
    });

    it('records no customer for a new sender once at the limit', async () => {
        limit.getCustomerLimit.mockResolvedValue(100);
        customerRepository.countByWorkspace.mockResolvedValue(100);

        await expect(build().resolveContactPoint(params)).resolves.toEqual({
            contactPoint: null,
            customerId: null,
            created: false,
        });
        expect(customerRepository.create).not.toHaveBeenCalled();
        expect(contactPointRepository.create).not.toHaveBeenCalled();
    });

    it('creates the customer while under the limit', async () => {
        limit.getCustomerLimit.mockResolvedValue(100);
        customerRepository.countByWorkspace.mockResolvedValue(99);

        const result = await build().resolveContactPoint(params);

        expect(result).toMatchObject({ customerId: 'cust-new', created: true });
    });

    it('still resolves an existing customer when the workspace is over', async () => {
        contactPointRepository.findByWorkspacePlatformSender.mockResolvedValue({
            id: 'cp-1',
            customer: { id: 'cust-1' },
        });
        limit.getCustomerLimit.mockResolvedValue(1);
        customerRepository.countByWorkspace.mockResolvedValue(500);

        const result = await build().resolveContactPoint(params);

        expect(result).toMatchObject({ customerId: 'cust-1', created: false });
        expect(limit.getCustomerLimit).not.toHaveBeenCalled();
    });

    it('never limits when the plan is unlimited or there is no seam', async () => {
        limit.getCustomerLimit.mockResolvedValue(null);
        await expect(
            build().resolveContactPoint(params)
        ).resolves.toMatchObject({ created: true });
        await expect(
            build(false).resolveContactPoint(params)
        ).resolves.toMatchObject({ created: true });
        expect(customerRepository.countByWorkspace).not.toHaveBeenCalled();
    });
});
