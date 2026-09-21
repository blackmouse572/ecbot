import { CustomerSystemController } from '../../../src/modules/customer/controllers/customer.system.controller';

// Unit-level controller spec. Auth is enforced by @ApiKeySystemProtected()
// (the shared SYSTEM api-key guard). Here we only verify the controller
// delegates to CustomerService with the right shape.

describe('CustomerSystemController (#174)', () => {
    const mockCustomerService = {
        setMetadataField: jest.fn(),
        updateProfileFromSystemTool: jest.fn(),
    };

    let controller: CustomerSystemController;

    beforeEach(() => {
        jest.clearAllMocks();
        controller = new CustomerSystemController(mockCustomerService as any);
    });

    describe('POST /system/customers/:customerId/fields', () => {
        it('forwards (customerId, key, value) to service.setMetadataField', async () => {
            mockCustomerService.setMetadataField.mockResolvedValue({});

            const result = await controller.setField('cust-1', {
                key: 'favourite_drink',
                value: 'cà phê sữa đá',
            } as any);

            expect(mockCustomerService.setMetadataField).toHaveBeenCalledWith(
                'cust-1',
                'favourite_drink',
                'cà phê sữa đá'
            );
            expect(result).toEqual({ ok: true });
        });
    });

    describe('POST /system/customers/:customerId/profile', () => {
        it('forwards the (name, phone, email, language) patch to updateProfileFromSystemTool', async () => {
            mockCustomerService.updateProfileFromSystemTool.mockResolvedValue(
                {}
            );

            const result = await controller.updateProfile('cust-1', {
                name: 'Alice',
                phone: '0901234567',
                email: 'a@b.co',
                language: 'vi',
            } as any);

            expect(
                mockCustomerService.updateProfileFromSystemTool
            ).toHaveBeenCalledWith('cust-1', {
                name: 'Alice',
                phone: '0901234567',
                email: 'a@b.co',
                language: 'vi',
            });
            expect(result).toEqual({ ok: true });
        });

        it('passes partial patches through (only phone supplied)', async () => {
            mockCustomerService.updateProfileFromSystemTool.mockResolvedValue(
                {}
            );

            await controller.updateProfile('cust-1', {
                phone: '0901234567',
            } as any);

            expect(
                mockCustomerService.updateProfileFromSystemTool
            ).toHaveBeenCalledWith('cust-1', {
                name: undefined,
                phone: '0901234567',
                email: undefined,
                language: undefined,
            });
        });
    });
});
