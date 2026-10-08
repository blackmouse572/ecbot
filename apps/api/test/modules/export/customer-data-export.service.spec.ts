import { CustomerDataExportService } from '@app/modules/export/services/customer-data-export.service';
import { NotFoundException } from '@nestjs/common';

// A workspace answers a data subject request from one of its end customers.
describe('CustomerDataExportService', () => {
    const customerRepository = { find: jest.fn() };
    const contactPointRepository = { find: jest.fn() };
    const conversationRepository = { find: jest.fn() };
    const messageRepository = { find: jest.fn() };
    let service: CustomerDataExportService;

    beforeEach(() => {
        jest.clearAllMocks();
        customerRepository.find.mockResolvedValue([
            {
                id: 'cust-1',
                name: 'Tran Thi B',
                phone: '0909',
                email: 'b@c.co',
                metadata: { city: 'HCM' },
                notes: 'VIP',
                profileSummary: 'Likes shoes',
                createdAt: new Date('2026-01-01T00:00:00Z'),
            },
        ]);
        contactPointRepository.find.mockResolvedValue([
            {
                id: 'cp-1',
                customer: { id: 'cust-1' },
                platform: 'FACEBOOK',
                externalSenderId: 'psid-1',
                displaySenderName: 'Bee',
                senderAvatar: 'https://fb/avatar',
            },
        ]);
        conversationRepository.find.mockResolvedValue([
            {
                id: 'conv-1',
                contactPoint: { id: 'cp-1' },
                senderName: 'Bee',
                status: 'open',
                createdAt: new Date('2026-01-02T00:00:00Z'),
            },
        ]);
        messageRepository.find.mockResolvedValue([
            {
                id: 'm-1',
                conversation: { id: 'conv-1' },
                direction: 'inbound',
                authorType: 'customer',
                text: 'Xin chao',
                attachments: [
                    { type: 'image', key: 'conversations/conv-1/a.jpg' },
                ],
                raw: { mid: 'x' },
                dateSent: new Date('2026-01-02T00:00:00Z'),
            },
        ]);
        service = new CustomerDataExportService(
            customerRepository as any,
            contactPointRepository as any,
            conversationRepository as any,
            messageRepository as any
        );
    });

    it('returns customer, contact points, conversations and their messages', async () => {
        const result = await service.export('cust-1', 'ws-1');

        expect(result.customer).toMatchObject({
            id: 'cust-1',
            name: 'Tran Thi B',
            phone: '0909',
            email: 'b@c.co',
            notes: 'VIP',
        });
        expect(result.contactPoints[0]).toMatchObject({
            externalSenderId: 'psid-1',
            displaySenderName: 'Bee',
        });
        expect(result.conversations).toHaveLength(1);
        expect(result.conversations[0].messages[0]).toMatchObject({
            id: 'm-1',
            text: 'Xin chao',
            raw: { mid: 'x' },
        });
    });

    it('scopes every lookup to the workspace', async () => {
        await service.export('cust-1', 'ws-1');

        expect(customerRepository.find.mock.calls[0][0]).toEqual({
            workspace: 'ws-1',
            $or: [{ id: 'cust-1' }, { mergedIntoCustomerId: 'cust-1' }],
        });
        expect(contactPointRepository.find.mock.calls[0][0]).toEqual({
            workspace: 'ws-1',
            customer: { $in: ['cust-1'] },
        });
        expect(conversationRepository.find.mock.calls[0][0]).toEqual({
            contactPoint: { $in: ['cp-1'] },
            chatbot: { workspace: 'ws-1' },
        });
        expect(messageRepository.find.mock.calls[0][0]).toEqual({
            conversation: { $in: ['conv-1'] },
        });
    });

    it('throws 404 when the customer is not in the workspace', async () => {
        customerRepository.find.mockResolvedValue([]);

        await expect(service.export('cust-x', 'ws-1')).rejects.toBeInstanceOf(
            NotFoundException
        );
    });
});
