import { ENUM_AWS_S3_ACCESSIBILITY } from '@app/modules/aws/enums/aws.enum';
import { CustomerErasureService } from '@app/modules/customer/services/customer-erasure.service';
import { NotFoundException } from '@nestjs/common';

describe('CustomerErasureService', () => {
    const tem = { tx: true };
    const customerRepository = {
        // Runs beforeCommit the way the transaction does.
        eraseInWorkspace: jest.fn(
            async (_c: string, _w: string, beforeCommit?: any) => {
                const rows = erasedRows;
                if (rows && beforeCommit) await beforeCommit(rows, tem);
                return rows;
            }
        ),
    };
    const s3 = {
        deleteItems: jest.fn().mockResolvedValue(undefined),
        deleteDir: jest.fn().mockResolvedValue(undefined),
    };
    const activityService = {
        createByUserWithWorkspace: jest.fn().mockResolvedValue({}),
    };
    const workspace = { id: 'ws-1' } as any;
    const user = { id: 'u-1' } as any;
    let service: CustomerErasureService;
    let erasedRows: any;

    const erased = {
        customerIds: ['cust-1'],
        contactPointIds: ['cp-1'],
        conversationIds: ['conv-1', 'conv-2'],
        messageCount: 4,
        mediaKeys: ['conversations/conv-1/a.jpg', 'conversations/conv-2/b.png'],
    };
    const summary = {
        customers: 1,
        contactPoints: 1,
        conversations: 2,
        messages: 4,
        mediaFiles: 2,
    };

    beforeEach(() => {
        jest.clearAllMocks();
        erasedRows = erased;
        service = new CustomerErasureService(
            customerRepository as any,
            s3 as any,
            activityService as any
        );
    });

    it('erases inside the caller workspace only', async () => {
        await service.erase('cust-1', workspace, user);

        expect(customerRepository.eraseInWorkspace).toHaveBeenCalledWith(
            'cust-1',
            'ws-1',
            expect.any(Function)
        );
    });

    it('throws 404 when the customer is missing or in another workspace', async () => {
        erasedRows = null;

        await expect(
            service.erase('cust-x', workspace, user)
        ).rejects.toBeInstanceOf(NotFoundException);
        expect(s3.deleteItems).not.toHaveBeenCalled();
        expect(
            activityService.createByUserWithWorkspace
        ).not.toHaveBeenCalled();
    });

    it('deletes the message media from the private bucket', async () => {
        await service.erase('cust-1', workspace, user);

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
        await expect(service.erase('cust-1', workspace, user)).resolves.toEqual(
            summary
        );
    });

    it('writes the ERASE audit row inside the delete transaction', async () => {
        await service.erase('cust-1', workspace, user);

        expect(activityService.createByUserWithWorkspace).toHaveBeenCalledWith(
            user,
            workspace,
            {
                action: 'erase',
                subject: 'CUSTOMER',
                metadata: { id: 'cust-1', ...summary },
            },
            { em: tem }
        );
    });

    it('retries a failed media delete once', async () => {
        s3.deleteItems.mockRejectedValueOnce(new Error('s3 blip'));

        await service.erase('cust-1', workspace, user);

        expect(s3.deleteItems).toHaveBeenCalledTimes(2);
        const [, , activity] =
            activityService.createByUserWithWorkspace.mock.calls[0];
        expect(activity.metadata.mediaCleanupFailed).toBeUndefined();
    });

    it('still succeeds when media cleanup keeps failing, and records what is left', async () => {
        s3.deleteItems.mockRejectedValue(new Error('s3 down'));
        s3.deleteDir
            .mockRejectedValueOnce(new Error('s3 down'))
            .mockRejectedValueOnce(new Error('s3 down'));

        await expect(
            service.erase('cust-1', workspace, user)
        ).resolves.toMatchObject({ conversations: 2 });

        const [, , activity] =
            activityService.createByUserWithWorkspace.mock.calls[0];
        expect(activity.metadata.mediaCleanupFailed).toEqual([
            ...erased.mediaKeys,
            'conversations/conv-1/',
        ]);
        s3.deleteItems.mockResolvedValue(undefined);
    });
});
