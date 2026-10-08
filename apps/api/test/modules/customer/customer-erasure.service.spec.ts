import { ENUM_AWS_S3_ACCESSIBILITY } from '@app/modules/aws/enums/aws.enum';
import { CustomerErasureService } from '@app/modules/customer/services/customer-erasure.service';
import { NotFoundException } from '@nestjs/common';

describe('CustomerErasureService', () => {
    const customerRepository = { eraseInWorkspace: jest.fn() };
    const s3 = {
        deleteItems: jest.fn().mockResolvedValue(undefined),
        deleteDir: jest.fn().mockResolvedValue(undefined),
    };
    let service: CustomerErasureService;

    const erased = {
        customerIds: ['cust-1'],
        contactPointIds: ['cp-1'],
        conversationIds: ['conv-1', 'conv-2'],
        messageCount: 4,
        mediaKeys: ['conversations/conv-1/a.jpg', 'conversations/conv-2/b.png'],
    };

    beforeEach(() => {
        jest.clearAllMocks();
        service = new CustomerErasureService(
            customerRepository as any,
            s3 as any
        );
    });

    it('erases inside the caller workspace only', async () => {
        customerRepository.eraseInWorkspace.mockResolvedValue(erased);

        await service.erase('cust-1', 'ws-1');

        expect(customerRepository.eraseInWorkspace).toHaveBeenCalledWith(
            'cust-1',
            'ws-1'
        );
    });

    it('throws 404 when the customer is missing or in another workspace', async () => {
        customerRepository.eraseInWorkspace.mockResolvedValue(null);

        await expect(service.erase('cust-x', 'ws-1')).rejects.toBeInstanceOf(
            NotFoundException
        );
        expect(s3.deleteItems).not.toHaveBeenCalled();
        expect(s3.deleteDir).not.toHaveBeenCalled();
    });

    it('deletes the message media from the private bucket', async () => {
        customerRepository.eraseInWorkspace.mockResolvedValue(erased);

        await service.erase('cust-1', 'ws-1');

        const PRIVATE = { access: ENUM_AWS_S3_ACCESSIBILITY.PRIVATE };
        expect(s3.deleteItems).toHaveBeenCalledWith(erased.mediaKeys, PRIVATE);
        expect(s3.deleteDir).toHaveBeenCalledWith(
            'conversations/conv-1/',
            PRIVATE
        );
        expect(s3.deleteDir).toHaveBeenCalledWith(
            'conversations/conv-2/',
            PRIVATE
        );
    });

    it('returns counts without personal data', async () => {
        customerRepository.eraseInWorkspace.mockResolvedValue(erased);

        await expect(service.erase('cust-1', 'ws-1')).resolves.toEqual({
            customers: 1,
            contactPoints: 1,
            conversations: 2,
            messages: 4,
            mediaFiles: 2,
        });
    });

    it('still reports success when S3 cleanup fails after the rows are gone', async () => {
        customerRepository.eraseInWorkspace.mockResolvedValue(erased);
        s3.deleteItems.mockRejectedValueOnce(new Error('s3 down'));

        await expect(service.erase('cust-1', 'ws-1')).resolves.toMatchObject({
            conversations: 2,
        });
    });
});
