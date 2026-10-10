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
describe('CustomerRepository data subject scope', () => {
    // Each entity answers its queued results in order, then [].
    const rows = new Map<unknown, unknown[][]>();
    const queue = (entity: unknown, ...results: unknown[][]) =>
        rows.set(entity, results);
    const tem = {
        find: jest.fn(
            async (entity: unknown, _where?: unknown, _options?: unknown) =>
                rows.get(entity)?.shift() ?? []
        ),
        nativeDelete: jest.fn().mockResolvedValue(1),
    };
    const em = {
        ...tem,
        transactional: jest.fn(async (cb: (e: unknown) => unknown) => cb(tem)),
    };
    let repo: CustomerRepository;

    beforeEach(() => {
        jest.clearAllMocks();
        rows.clear();
        repo = new CustomerRepository(em as unknown as EntityManager);
    });

    const findWhere = (entity: unknown) =>
        tem.find.mock.calls.filter(([e]) => e === entity).map(([, w]) => w);

    describe('eraseInWorkspace', () => {
        it('returns null and deletes nothing when the customer is not in the workspace', async () => {
            const beforeCommit = jest.fn();

            await expect(
                repo.eraseInWorkspace('cust-1', 'ws-1', beforeCommit)
            ).resolves.toBe(null);

            expect(findWhere(CustomerEntity)[0]).toEqual({
                workspace: 'ws-1',
                $or: [{ id: 'cust-1' }, { mergedIntoCustomerId: 'cust-1' }],
            });
            expect(tem.nativeDelete).not.toHaveBeenCalled();
            expect(beforeCommit).not.toHaveBeenCalled();
        });

        it('hard deletes the customer, merged duplicates, contact points, conversations and messages', async () => {
            queue(CustomerEntity, [{ id: 'cust-1' }, { id: 'cust-old' }]);
            queue(ContactPointEntity, [
                { id: 'cp-1', platform: 'FACEBOOK', externalSenderId: 'psid' },
                { id: 'cp-2', platform: 'ZALO', externalSenderId: 'zid' },
            ]);
            queue(ConversationEntity, [{ id: 'conv-1' }, { id: 'conv-2' }]);
            queue(MessageEntity, [
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

            expect(findWhere(ContactPointEntity)[0]).toEqual({
                workspace: 'ws-1',
                customer: { $in: ['cust-1', 'cust-old'] },
            });

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
                        $or: [
                            { customerA: customers },
                            { customerB: customers },
                        ],
                    },
                ],
                [
                    ContactPointEntity,
                    { id: { $in: ['cp-1', 'cp-2'] }, workspace: 'ws-1' },
                ],
                [CustomerEntity, { id: customers, workspace: 'ws-1' }],
            ]);
        });

        it('follows merge chains: A merged into B merged into C', async () => {
            queue(
                CustomerEntity,
                [{ id: 'C' }, { id: 'B' }],
                [{ id: 'A' }],
                []
            );

            const result = await repo.eraseInWorkspace('C', 'ws-1');

            expect(result?.customerIds).toEqual(['C', 'B', 'A']);
            expect(findWhere(CustomerEntity)[1]).toEqual({
                workspace: 'ws-1',
                mergedIntoCustomerId: { $in: ['B'] },
                id: { $nin: ['C', 'B'] },
            });
            expect(tem.nativeDelete).toHaveBeenCalledWith(CustomerEntity, {
                id: { $in: ['C', 'B', 'A'] },
                workspace: 'ws-1',
            });
        });

        it('also reaches conversations never linked to the contact point', async () => {
            queue(CustomerEntity, [{ id: 'cust-1' }]);
            queue(ContactPointEntity, [
                { id: 'cp-1', platform: 'FACEBOOK', externalSenderId: 'psid' },
            ]);

            await repo.eraseInWorkspace('cust-1', 'ws-1');

            expect(findWhere(ConversationEntity)[0]).toEqual({
                chatbot: { workspace: 'ws-1' },
                $or: [
                    { contactPoint: { $in: ['cp-1'] } },
                    {
                        contactPoint: null,
                        senderId: 'psid',
                        account: { type: 'FACEBOOK' },
                    },
                ],
            });
        });

        it('skips conversation tables when the customer has no contact points', async () => {
            queue(CustomerEntity, [{ id: 'cust-1' }]);

            const result = await repo.eraseInWorkspace('cust-1', 'ws-1');

            expect(result?.conversationIds).toEqual([]);
            const deleted = tem.nativeDelete.mock.calls.map(([e]) => e);
            expect(deleted).not.toContain(MessageEntity);
            expect(deleted).toContain(CustomerEntity);
        });

        it('runs beforeCommit inside the transaction, after the deletes', async () => {
            queue(CustomerEntity, [{ id: 'cust-1' }]);
            const beforeCommit = jest.fn(async () => {
                expect(tem.nativeDelete).toHaveBeenCalledWith(
                    CustomerEntity,
                    expect.anything()
                );
            });

            const result = await repo.eraseInWorkspace(
                'cust-1',
                'ws-1',
                beforeCommit
            );

            expect(beforeCommit).toHaveBeenCalledWith(result, tem);
        });

        it('rolls back when beforeCommit throws', async () => {
            queue(CustomerEntity, [{ id: 'cust-1' }]);

            await expect(
                repo.eraseInWorkspace('cust-1', 'ws-1', async () => {
                    throw new Error('audit failed');
                })
            ).rejects.toThrow('audit failed');
        });
    });

    describe('findSubjectData', () => {
        it('returns null when the customer is not in the workspace', async () => {
            await expect(repo.findSubjectData('cust-x', 'ws-1')).resolves.toBe(
                null
            );
        });

        it('collects messages, tags, follow-ups and tool calls of the whole scope', async () => {
            queue(CustomerEntity, [{ id: 'C' }, { id: 'B' }], [{ id: 'A' }]);
            queue(ContactPointEntity, [
                { id: 'cp-1', platform: 'FACEBOOK', externalSenderId: 'psid' },
            ]);
            queue(ConversationEntity, [{ id: 'conv-1' }]);
            queue(MessageEntity, [{ id: 'm-1' }]);
            queue(CustomerTagAssignmentEntity, [{ id: 'ta-1' }]);
            queue(FollowupEntity, [{ id: 'f-1' }]);
            queue(ToolInvocationEntity, [{ id: 'ti-1' }]);

            const data = await repo.findSubjectData('C', 'ws-1');

            expect(data?.customers.map(c => c.id)).toEqual(['C', 'B', 'A']);
            expect(data?.messages).toEqual([{ id: 'm-1' }]);
            expect(data?.tagAssignments).toEqual([{ id: 'ta-1' }]);
            expect(data?.followups).toEqual([{ id: 'f-1' }]);
            expect(data?.toolInvocations).toEqual([{ id: 'ti-1' }]);
            expect(findWhere(CustomerTagAssignmentEntity)[0]).toEqual({
                customer: { $in: ['C', 'B', 'A'] },
                deletedAt: null,
            });
            expect(findWhere(ToolInvocationEntity)[0]).toEqual({
                conversationId: { $in: ['conv-1'] },
            });
        });
    });
});
