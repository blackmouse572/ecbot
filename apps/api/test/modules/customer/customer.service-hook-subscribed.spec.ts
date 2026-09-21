import { CustomerService } from '../../../src/modules/customer/services/customer.service';

// #169 adds the subscriber: CustomerService._onContactFieldChanged now routes
// to CustomerMergeSuggestionService.detectAndUpsert. The hook-fired tests in
// customer-service-hooks.spec.ts (#174) assert the hook is *invoked*; this
// suite asserts the hook is correctly *subscribed* — the merge-suggestion
// service.detectAndUpsert gets the right (workspaceId, customerId, field, value).

describe('CustomerService — merge-detection subscribed to _onContactFieldChanged (#175)', () => {
    let service: CustomerService;

    const mockCustomerRepository = {
        findOneById: jest.fn(),
        updateEntity: jest.fn(),
    };
    const mockContactPointRepository = {} as any;
    const mockMergeSuggestionService = {
        detectAndUpsert: jest.fn().mockResolvedValue([]),
    };

    const baseCustomer = {
        id: 'cust-1',
        workspace: { id: 'ws-1' },
        metadata: {},
        phone: null,
        email: null,
    };

    beforeEach(() => {
        jest.clearAllMocks();
        service = new CustomerService(
            mockCustomerRepository as any,
            mockContactPointRepository,
            { get: jest.fn(() => mockMergeSuggestionService) } as any
        );
        mockCustomerRepository.findOneById.mockResolvedValue(baseCustomer);
        mockCustomerRepository.updateEntity.mockResolvedValue({
            ...baseCustomer,
        });
    });

    describe('setMetadataField — agent system-tool path', () => {
        it("calls mergeSuggestionService.detectAndUpsert exactly once with field='phone' when phone is written", async () => {
            await service.setMetadataField('cust-1', 'phone', '0901234567');

            expect(
                mockMergeSuggestionService.detectAndUpsert
            ).toHaveBeenCalledTimes(1);
            expect(
                mockMergeSuggestionService.detectAndUpsert
            ).toHaveBeenCalledWith({
                workspaceId: 'ws-1',
                customerId: 'cust-1',
                field: 'phone',
                value: '0901234567',
            });
        });

        it("calls detectAndUpsert with field='email' when email is written", async () => {
            await service.setMetadataField('cust-1', 'email', 'a@b.co');

            expect(
                mockMergeSuggestionService.detectAndUpsert
            ).toHaveBeenCalledTimes(1);
            expect(
                mockMergeSuggestionService.detectAndUpsert
            ).toHaveBeenCalledWith({
                workspaceId: 'ws-1',
                customerId: 'cust-1',
                field: 'email',
                value: 'a@b.co',
            });
        });

        it('does NOT call detectAndUpsert for non-contact metadata fields (e.g. birthday)', async () => {
            await service.setMetadataField('cust-1', 'birthday', '1990-01-01');

            expect(
                mockMergeSuggestionService.detectAndUpsert
            ).not.toHaveBeenCalled();
        });

        it("does NOT call detectAndUpsert for arbitrary keys like 'name'", async () => {
            await service.setMetadataField('cust-1', 'name', 'Alice');

            expect(
                mockMergeSuggestionService.detectAndUpsert
            ).not.toHaveBeenCalled();
        });
    });

    describe('update (operator-edit) — workspace controller path', () => {
        it('fires detectAndUpsert for phone when the patch includes a phone change', async () => {
            await service.update('cust-1', { phone: 'new-phone' });

            expect(
                mockMergeSuggestionService.detectAndUpsert
            ).toHaveBeenCalledWith({
                workspaceId: 'ws-1',
                customerId: 'cust-1',
                field: 'phone',
                value: 'new-phone',
            });
        });

        it('fires detectAndUpsert for email when the patch includes an email change', async () => {
            await service.update('cust-1', { email: 'new@example.com' });

            expect(
                mockMergeSuggestionService.detectAndUpsert
            ).toHaveBeenCalledWith({
                workspaceId: 'ws-1',
                customerId: 'cust-1',
                field: 'email',
                value: 'new@example.com',
            });
        });

        it('fires both phone AND email detections when the patch includes both', async () => {
            await service.update('cust-1', {
                phone: 'p',
                email: 'e@e.co',
            });

            expect(
                mockMergeSuggestionService.detectAndUpsert
            ).toHaveBeenCalledTimes(2);
            expect(
                mockMergeSuggestionService.detectAndUpsert
            ).toHaveBeenCalledWith(expect.objectContaining({ field: 'phone' }));
            expect(
                mockMergeSuggestionService.detectAndUpsert
            ).toHaveBeenCalledWith(expect.objectContaining({ field: 'email' }));
        });

        it('does NOT fire detection when the patch omits phone/email (e.g. name only)', async () => {
            await service.update('cust-1', { name: 'Alice' });

            expect(
                mockMergeSuggestionService.detectAndUpsert
            ).not.toHaveBeenCalled();
        });

        it('swallows errors from detectAndUpsert so the customer update still succeeds', async () => {
            mockMergeSuggestionService.detectAndUpsert.mockRejectedValueOnce(
                new Error('downstream blew up')
            );

            await expect(
                service.update('cust-1', { phone: 'new-phone' })
            ).resolves.toBeDefined();
        });
    });
});
