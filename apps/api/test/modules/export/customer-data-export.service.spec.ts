import { CustomerDataExportService } from '@app/modules/export/services/customer-data-export.service';
import { NotFoundException } from '@nestjs/common';

// A workspace answers a data subject request from one of its end customers.
describe('CustomerDataExportService', () => {
    const customerRepository = { findSubjectData: jest.fn() };
    let service: CustomerDataExportService;

    const subject = () => ({
        customers: [
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
            { id: 'cust-old', mergedIntoCustomerId: 'cust-1' },
        ],
        contactPoints: [
            {
                id: 'cp-1',
                customer: { id: 'cust-1' },
                platform: 'FACEBOOK',
                externalSenderId: 'psid-1',
                displaySenderName: 'Bee',
                senderAvatar: 'https://fb/avatar',
            },
        ],
        conversations: [
            {
                id: 'conv-1',
                contactPoint: { id: 'cp-1' },
                senderName: 'Bee',
                status: 'open',
                createdAt: new Date('2026-01-02T00:00:00Z'),
            },
        ],
        messages: [
            {
                id: 'm-1',
                conversation: { id: 'conv-1' },
                direction: 'inbound',
                authorType: 'customer',
                text: 'Xin chao',
                attachments: [
                    { type: 'image', key: 'conversations/conv-1/a.jpg' },
                    { type: 'image', url: 'https://fbcdn/x.jpg' },
                ],
                raw: { mid: 'x' },
                dateSent: new Date('2026-01-02T00:00:00Z'),
            },
        ],
        tagAssignments: [
            {
                customer: { id: 'cust-1' },
                tag: { name: 'VIP' },
                createdAt: new Date('2026-01-03T00:00:00Z'),
            },
        ],
        followups: [
            {
                id: 'f-1',
                conversation: { id: 'conv-1' },
                prompt: 'Ask about the order',
                reason: 'no reply',
                status: 'SCHEDULED',
                scheduledAt: new Date('2026-01-04T00:00:00Z'),
            },
        ],
        toolInvocations: [
            {
                id: 't-1',
                conversationId: 'conv-1',
                actionName: 'lookup_order',
                status: 'SUCCESS',
                inputArgs: { phone: '0909' },
                createdAt: new Date('2026-01-02T00:00:00Z'),
            },
        ],
    });

    beforeEach(() => {
        jest.clearAllMocks();
        customerRepository.findSubjectData.mockResolvedValue(subject());
        service = new CustomerDataExportService(customerRepository as any);
    });

    it('scopes the lookup to the workspace', async () => {
        await service.export('cust-1', 'ws-1');

        expect(customerRepository.findSubjectData).toHaveBeenCalledWith(
            'cust-1',
            'ws-1'
        );
    });

    it('returns customer, merged profiles, contact points, conversations and their messages', async () => {
        const result = await service.export('cust-1', 'ws-1');

        expect(result.customer).toMatchObject({
            id: 'cust-1',
            name: 'Tran Thi B',
            phone: '0909',
            email: 'b@c.co',
            notes: 'VIP',
        });
        expect(result.mergedCustomers.map(c => c.id)).toEqual(['cust-old']);
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

    it('includes tags, follow-ups and tool invocations', async () => {
        const result = await service.export('cust-1', 'ws-1');

        expect(result.tags).toEqual([
            {
                customerId: 'cust-1',
                name: 'VIP',
                assignedAt: new Date('2026-01-03T00:00:00Z'),
            },
        ]);
        expect(result.followups[0]).toMatchObject({
            conversationId: 'conv-1',
            prompt: 'Ask about the order',
        });
        expect(result.toolInvocations[0]).toMatchObject({
            conversationId: 'conv-1',
            actionName: 'lookup_order',
            inputArgs: { phone: '0909' },
        });
    });

    it('names stored files by file name, never by storage key or bucket', async () => {
        const result = await service.export('cust-1', 'ws-1');

        expect(result.conversations[0].messages[0].attachments).toEqual([
            { type: 'image', description: undefined, file: 'a.jpg' },
            {
                type: 'image',
                description: undefined,
                url: 'https://fbcdn/x.jpg',
            },
        ]);
        expect(JSON.stringify(result)).not.toContain('conversations/conv-1/');
    });

    it('throws 404 when the customer is not in the workspace', async () => {
        customerRepository.findSubjectData.mockResolvedValue(null);

        await expect(service.export('cust-x', 'ws-1')).rejects.toBeInstanceOf(
            NotFoundException
        );
    });
});
