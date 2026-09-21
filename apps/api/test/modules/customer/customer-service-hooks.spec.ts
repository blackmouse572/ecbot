import { CustomerService } from '../../../src/modules/customer/services/customer.service';

// Asserts the contact-field-changed hook is invoked for phone/email writes via
// both system-tool entry points. #169 (match detection) will subscribe here.

describe('CustomerService — _onContactFieldChanged hook (#174)', () => {
    let service: CustomerService;

    const mockCustomerRepository = {
        findOneById: jest.fn(),
        updateEntity: jest.fn(),
    };
    const mockContactPointRepository = {
        updateEntity: jest.fn(),
    };

    const baseCustomer = {
        id: 'cust-1',
        workspace: { id: 'ws-1' },
        metadata: {},
    };

    beforeEach(() => {
        jest.clearAllMocks();
        service = new CustomerService(
            mockCustomerRepository as any,
            mockContactPointRepository as any,
            { get: jest.fn() } as any
        );
        mockCustomerRepository.findOneById.mockResolvedValue(baseCustomer);
        mockCustomerRepository.updateEntity.mockResolvedValue({
            ...baseCustomer,
        });
    });

    describe('setMetadataField', () => {
        it("calls _onContactFieldChanged exactly once with field='phone' when setting phone", async () => {
            const hookSpy = jest.spyOn(
                service as any,
                '_onContactFieldChanged'
            );

            await service.setMetadataField('cust-1', 'phone', '0901234567');

            expect(hookSpy).toHaveBeenCalledTimes(1);
            // #169: the hook is workspace-scoped, so the customer's workspace
            // id is passed through as the 4th argument.
            expect(hookSpy).toHaveBeenCalledWith(
                'cust-1',
                'phone',
                '0901234567',
                'ws-1'
            );
        });

        it("calls _onContactFieldChanged with field='email' when setting email", async () => {
            const hookSpy = jest.spyOn(
                service as any,
                '_onContactFieldChanged'
            );

            await service.setMetadataField('cust-1', 'email', 'a@b.co');

            expect(hookSpy).toHaveBeenCalledTimes(1);
            expect(hookSpy).toHaveBeenCalledWith(
                'cust-1',
                'email',
                'a@b.co',
                'ws-1'
            );
        });

        it('does NOT call the hook for non-contact fields (e.g. birthday)', async () => {
            const hookSpy = jest.spyOn(
                service as any,
                '_onContactFieldChanged'
            );

            await service.setMetadataField('cust-1', 'birthday', '1990-01-01');

            expect(hookSpy).not.toHaveBeenCalled();
        });
    });

    describe('updateProfileFromSystemTool', () => {
        it("fires _onContactFieldChanged with field='phone' when the patch includes phone", async () => {
            const hookSpy = jest.spyOn(
                service as any,
                '_onContactFieldChanged'
            );

            await service.updateProfileFromSystemTool('cust-1', {
                phone: '0901234567',
            });

            expect(hookSpy).toHaveBeenCalledTimes(1);
            expect(hookSpy).toHaveBeenCalledWith(
                'cust-1',
                'phone',
                '0901234567',
                'ws-1'
            );
        });

        it('fires the hook once for phone AND once for email when both are in the patch', async () => {
            const hookSpy = jest.spyOn(
                service as any,
                '_onContactFieldChanged'
            );

            await service.updateProfileFromSystemTool('cust-1', {
                phone: '0901234567',
                email: 'x@y.com',
            });

            expect(hookSpy).toHaveBeenCalledTimes(2);
            expect(hookSpy).toHaveBeenCalledWith(
                'cust-1',
                'phone',
                '0901234567',
                'ws-1'
            );
            expect(hookSpy).toHaveBeenCalledWith(
                'cust-1',
                'email',
                'x@y.com',
                'ws-1'
            );
        });

        it("does NOT fire the hook for non-contact patches (e.g. {language: 'vi'})", async () => {
            const hookSpy = jest.spyOn(
                service as any,
                '_onContactFieldChanged'
            );

            await service.updateProfileFromSystemTool('cust-1', {
                language: 'vi',
            });

            expect(hookSpy).not.toHaveBeenCalled();
        });
    });
});
