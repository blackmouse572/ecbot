import { ConversationReadEntity } from '@app/modules/conversation/repository/entities/conversation-read.entity';
import { ConversationEntity } from '@app/modules/conversation/repository/entities/conversation.entity';
import { MessageEntity } from '@app/modules/conversation/repository/entities/message.entity';
import { ContactPointEntity } from '@app/modules/customer/repository/entities/contact-point.entity';
import { CustomerMergeSuggestionEntity } from '@app/modules/customer/repository/entities/customer-merge-suggestion.entity';
import { CustomerTagAssignmentEntity } from '@app/modules/customer/repository/entities/customer-tag-assignment.entity';
import { CustomerEntity } from '@app/modules/customer/repository/entities/customer.entity';
import { CustomerRepository } from '@app/modules/customer/repository/repositories/customer.repository';
import { FollowupEntity } from '@app/modules/platform/repository/entities/followup.entity';
import { ToolInvocationEntity } from '@app/modules/tool/repository/entities/tool-invocation.entity';
import { EntityManager } from '@mikro-orm/postgresql';

// Erasure (GDPR Art 17 / Decree 13): hard delete a customer and everything
// that holds their data, inside one transaction, never leaving the workspace.
describe('CustomerRepository.eraseInWorkspace', () => {
    const rows = new Map<unknown, unknown[]>();
    const tem = {
        find: jest.fn(
            async (entity: unknown, _where?: unknown, _options?: unknown) =>
                rows.get(entity) ?? []
        ),
        nativeDelete: jest.fn().mockResolvedValue(1),
    };
    const em = {
        transactional: jest.fn(async (cb: (e: unknown) => unknown) => cb(tem)),
    };
    let repo: CustomerRepository;

    beforeEach(() => {
        jest.clearAllMocks();
        rows.clear();
        repo = new CustomerRepository(em as unknown as EntityManager);
    });

    it('returns null and deletes nothing when the customer is not in the workspace', async () => {
        await expect(repo.eraseInWorkspace('cust-1', 'ws-1')).resolves.toBe(
            null
        );

        const [entity, where] = tem.find.mock.calls[0];
        expect(entity).toBe(CustomerEntity);
        expect(where).toEqual({
            workspace: 'ws-1',
            $or: [{ id: 'cust-1' }, { mergedIntoCustomerId: 'cust-1' }],
        });
        expect(tem.nativeDelete).not.toHaveBeenCalled();
    });

    it('hard deletes the customer, merged duplicates, contact points, conversations and messages', async () => {
        rows.set(CustomerEntity, [{ id: 'cust-1' }, { id: 'cust-old' }]);
        rows.set(ContactPointEntity, [{ id: 'cp-1' }, { id: 'cp-2' }]);
        rows.set(ConversationEntity, [{ id: 'conv-1' }, { id: 'conv-2' }]);
        rows.set(MessageEntity, [
            {
                attachments: [
                    { type: 'image', key: 'conversations/conv-1/a.jpg' },
                    { type: 'image', url: 'https://cdn/bot.png' },
                ],
            },
            { attachments: null },
            {
                attachments: [
                    { type: 'image', key: 'conversations/conv-2/b.png' },
                ],
            },
        ]);

        const result = await repo.eraseInWorkspace('cust-1', 'ws-1');

        expect(result).toEqual({
            customerIds: ['cust-1', 'cust-old'],
            contactPointIds: ['cp-1', 'cp-2'],
            conversationIds: ['conv-1', 'conv-2'],
            messageCount: 3,
            mediaKeys: [
                'conversations/conv-1/a.jpg',
                'conversations/conv-2/b.png',
            ],
        });

        // Contact points and conversations are looked up inside the workspace.
        expect(tem.find).toHaveBeenCalledWith(
            ContactPointEntity,
            { workspace: 'ws-1', customer: { $in: ['cust-1', 'cust-old'] } },
            expect.anything()
        );
        expect(tem.find).toHaveBeenCalledWith(
            ConversationEntity,
            {
                contactPoint: { $in: ['cp-1', 'cp-2'] },
                chatbot: { workspace: 'ws-1' },
            },
            expect.anything()
        );

        const convs = { $in: ['conv-1', 'conv-2'] };
        const customers = { $in: ['cust-1', 'cust-old'] };
        // Children before parents, so no FK blocks the delete.
        expect(tem.nativeDelete.mock.calls).toEqual([
            [ToolInvocationEntity, { conversationId: convs }],
            [FollowupEntity, { conversation: convs }],
            [ConversationReadEntity, { conversation: convs }],
            [MessageEntity, { conversation: convs }],
            [ConversationEntity, { id: convs }],
            [CustomerTagAssignmentEntity, { customer: customers }],
            [
                CustomerMergeSuggestionEntity,
                {
                    workspace: 'ws-1',
                    $or: [{ customerA: customers }, { customerB: customers }],
                },
            ],
            [
                ContactPointEntity,
                { id: { $in: ['cp-1', 'cp-2'] }, workspace: 'ws-1' },
            ],
            [CustomerEntity, { id: customers, workspace: 'ws-1' }],
        ]);
    });

    it('skips conversation tables when the customer has no contact points', async () => {
        rows.set(CustomerEntity, [{ id: 'cust-1' }]);

        const result = await repo.eraseInWorkspace('cust-1', 'ws-1');

        expect(result?.conversationIds).toEqual([]);
        const deleted = tem.nativeDelete.mock.calls.map(([e]) => e);
        expect(deleted).not.toContain(MessageEntity);
        expect(deleted).toContain(CustomerEntity);
    });
});
