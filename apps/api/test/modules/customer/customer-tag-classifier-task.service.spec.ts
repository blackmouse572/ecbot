import { of, throwError } from 'rxjs';
import * as Sentry from '@sentry/nestjs';
import { ENUM_CONVERSATION_STATUS } from '../../../src/modules/conversation/enums/conversation.enum';
import {
    ENUM_MESSAGE_AUTHOR,
    ENUM_MESSAGE_DIRECTION,
} from '../../../src/modules/conversation/enums/message.enum';
import {
    CUSTOMER_TAG_CLASSIFIER_MAX_ATTEMPTS,
    CUSTOMER_TAG_CLASSIFIER_SENTRY_QUEUE,
    ENUM_CUSTOMER_TAG_CLASSIFIER_PROCESS,
} from '../../../src/modules/customer/constants/customer-tag-classifier.constant';
import { ENUM_AI_USAGE_SOURCE } from '../../../src/app/ai-usage-meter.interface';
import { CustomerTagClassifierTaskService } from '../../../src/modules/customer/services/customer-tag-classifier-task.service';

jest.mock('@sentry/nestjs', () => ({ captureException: jest.fn() }));
jest.mock('@app/common/utils/gcp-id-token.util', () => ({
    getInternalAuthHeader: jest
        .fn()
        .mockResolvedValue({ Authorization: 'Bearer gcp-id-token' }),
}));

describe('CustomerTagClassifierTaskService (#170 — Cloud Tasks handler)', () => {
    let service: CustomerTagClassifierTaskService;

    const conversationRepository = { findOneById: jest.fn() };
    const messageRepository = { findByConversation: jest.fn() };
    const customerRepository = { updateEntity: jest.fn() };
    const customerTagService = { findAllByWorkspace: jest.fn() };
    const customerTagAssignmentService = {
        listByCustomer: jest.fn(),
        apply: jest.fn(),
        remove: jest.fn(),
    };
    const classifierService = {
        buildSnapshotKeyFor: jest.fn(
            (date: Date | undefined, status: string) =>
                `${date ? date.toISOString() : 'null'}:${status}`
        ),
    };
    const httpService = { post: jest.fn() };
    const configService = {
        get: jest.fn((key: string) =>
            key === 'ai.internalToken' ? 'test-token' : 'http://ai-test'
        ),
    };

    const lastMessageAt = new Date('2026-06-15T12:00:00Z');
    const snapshotKey = `${lastMessageAt.toISOString()}:${ENUM_CONVERSATION_STATUS.RESOLVED}`;

    const dto = () => ({
        jobName: ENUM_CUSTOMER_TAG_CLASSIFIER_PROCESS.CLASSIFY,
        conversationId: 'conv-1',
        snapshotKey,
    });

    function liveConversation(overrides: Partial<any> = {}) {
        return {
            id: 'conv-1',
            lastMessageAt,
            status: ENUM_CONVERSATION_STATUS.RESOLVED,
            contactPoint: { customer: { id: 'cust-1' } },
            chatbot: { workspace: { id: 'ws-1' } },
            ...overrides,
        };
    }

    function classifierResponse(body: Record<string, unknown>) {
        return of({ data: { status: 200, msg: 'OK', data: body } });
    }

    beforeEach(() => {
        jest.clearAllMocks();
        configService.get.mockImplementation((key: string) =>
            key === 'ai.internalToken' ? 'test-token' : 'http://ai-test'
        );
        conversationRepository.findOneById.mockResolvedValue(
            liveConversation()
        );
        messageRepository.findByConversation.mockResolvedValue([
            {
                authorType: ENUM_MESSAGE_AUTHOR.USER,
                direction: ENUM_MESSAGE_DIRECTION.INBOUND,
                text: 'Hello',
                dateSent: new Date('2026-06-15T11:55:00Z'),
            },
        ]);
        customerTagService.findAllByWorkspace.mockResolvedValue([]);
        customerTagAssignmentService.listByCustomer.mockResolvedValue([]);
        httpService.post.mockReturnValue(
            classifierResponse({
                tags_to_add: [],
                tags_to_remove: [],
                profile_summary: '',
            })
        );
        service = new CustomerTagClassifierTaskService(
            conversationRepository as any,
            messageRepository as any,
            customerRepository as any,
            customerTagService as any,
            customerTagAssignmentService as any,
            classifierService as any,
            httpService as any,
            configService as any
        );
    });

    it('sends the GCP ID token and internal token headers on the classify call', async () => {
        await service.handle(dto() as any, 0);

        const [, , options] = httpService.post.mock.calls[0];
        expect(options.headers).toEqual({
            Authorization: 'Bearer gcp-id-token',
            'X-Internal-Token': 'test-token',
            'Content-Type': 'application/json',
        });
    });

    it('skips all classifier side effects when the live snapshot is stale', async () => {
        // This live check is the final guard for the intentionally non-atomic
        // list/delete/enqueue scheduling sequence.
        conversationRepository.findOneById.mockResolvedValue(
            liveConversation({
                lastMessageAt: new Date('2026-06-15T12:30:00Z'),
            })
        );

        await service.handle(dto() as any, 0);

        expect(httpService.post).not.toHaveBeenCalled();
        expect(customerTagAssignmentService.apply).not.toHaveBeenCalled();
        expect(customerTagAssignmentService.remove).not.toHaveBeenCalled();
        expect(customerRepository.updateEntity).not.toHaveBeenCalled();
    });

    it('filters handoff tags before calling the classifier and never assigns them', async () => {
        const catalog = [
            {
                id: 'tag-vip',
                name: 'VIP',
                emoji: '⭐',
                description: 'Big spender',
                triggersHandoff: false,
            },
            {
                id: 'tag-handoff',
                name: 'NEEDS_HUMAN',
                emoji: null,
                description: 'Escalate',
                triggersHandoff: true,
            },
        ];
        customerTagService.findAllByWorkspace.mockResolvedValue(catalog);
        httpService.post.mockReturnValue(
            classifierResponse({
                tags_to_add: ['VIP', 'NEEDS_HUMAN'],
                tags_to_remove: [],
                profile_summary: '',
            })
        );

        await service.handle(dto() as any, 0);

        const [, body] = httpService.post.mock.calls[0];
        expect(body.available_tags.map((tag: any) => tag.name)).toEqual([
            'VIP',
        ]);
        expect(customerTagAssignmentService.apply).toHaveBeenCalledWith(
            'cust-1',
            'tag-vip',
            undefined,
            expect.objectContaining({ actor: 'CLASSIFIER' })
        );
        expect(customerTagAssignmentService.apply).toHaveBeenCalledTimes(1);
    });

    // #288 review: a notify-only tag (Order placed) tells the team, so only
    // the agent may apply it; the classifier must neither add nor drop it.
    it('keeps notify-only tags out of the classifier, both ways', async () => {
        customerTagService.findAllByWorkspace.mockResolvedValue([
            {
                id: 'tag-vip',
                name: 'VIP',
                emoji: null,
                description: '',
                triggersHandoff: false,
                notifiesTeam: false,
            },
            {
                id: 'tag-order',
                name: 'Order placed',
                emoji: null,
                description: '',
                triggersHandoff: false,
                notifiesTeam: true,
            },
        ]);
        customerTagAssignmentService.listByCustomer.mockResolvedValue([
            { tag: { id: 'tag-order', name: 'Order placed' } },
        ]);
        httpService.post.mockReturnValue(
            classifierResponse({
                tags_to_add: ['Order placed'],
                tags_to_remove: ['Order placed'],
                profile_summary: '',
            })
        );

        await service.handle(dto() as any, 0);

        const [, body] = httpService.post.mock.calls[0];
        expect(body.available_tags.map((tag: any) => tag.name)).toEqual([
            'VIP',
        ]);
        expect(customerTagAssignmentService.apply).not.toHaveBeenCalled();
        expect(customerTagAssignmentService.remove).not.toHaveBeenCalled();
    });

    it('applies only catalog-known additions and currently assigned removals', async () => {
        const tagVip = {
            id: 'tag-vip',
            name: 'VIP',
            emoji: null,
            description: '',
            triggersHandoff: false,
        };
        customerTagService.findAllByWorkspace.mockResolvedValue([tagVip]);
        customerTagAssignmentService.listByCustomer.mockResolvedValue([
            { tag: { id: 'tag-vip', name: 'VIP' } },
        ]);
        httpService.post.mockReturnValue(
            classifierResponse({
                tags_to_add: ['VIP', 'UNKNOWN'],
                tags_to_remove: ['VIP', 'NOT_ASSIGNED'],
                profile_summary: '',
            })
        );

        await service.handle(dto() as any, 0);

        expect(customerTagAssignmentService.apply).toHaveBeenCalledWith(
            'cust-1',
            'tag-vip',
            undefined,
            expect.objectContaining({ actor: 'CLASSIFIER' })
        );
        expect(customerTagAssignmentService.remove).toHaveBeenCalledWith(
            'cust-1',
            'tag-vip',
            undefined,
            expect.objectContaining({ actor: 'CLASSIFIER' })
        );
        expect(customerTagAssignmentService.apply).toHaveBeenCalledTimes(1);
        expect(customerTagAssignmentService.remove).toHaveBeenCalledTimes(1);
    });

    // Vietnamese default tags carry diacritics, which have two Unicode forms
    // (precomposed NFC and decomposed NFD). A model may answer in the other
    // form than the catalog stores; the names still have to match.
    it('matches tag names whatever Unicode form the classifier returns', async () => {
        const returning = {
            id: 'tag-returning',
            name: 'Khách quay lại'.normalize('NFC'),
            emoji: null,
            description: '',
            triggersHandoff: false,
        };
        customerTagService.findAllByWorkspace.mockResolvedValue([returning]);
        customerTagAssignmentService.listByCustomer.mockResolvedValue([
            { tag: { id: 'tag-returning', name: returning.name } },
        ]);
        httpService.post.mockReturnValue(
            classifierResponse({
                tags_to_add: ['Khách quay lại'.normalize('NFD')],
                tags_to_remove: ['Khách quay lại'.normalize('NFD')],
                profile_summary: '',
            })
        );

        await service.handle(dto() as any, 0);

        expect(customerTagAssignmentService.apply).toHaveBeenCalledWith(
            'cust-1',
            'tag-returning',
            undefined,
            expect.objectContaining({ actor: 'CLASSIFIER' })
        );
        expect(customerTagAssignmentService.remove).toHaveBeenCalledWith(
            'cust-1',
            'tag-returning',
            undefined,
            expect.objectContaining({ actor: 'CLASSIFIER' })
        );
    });

    it('writes a trimmed profile summary', async () => {
        httpService.post.mockReturnValue(
            classifierResponse({ profile_summary: '  Loyal buyer.  ' })
        );

        await service.handle(dto() as any, 0);

        expect(customerRepository.updateEntity).toHaveBeenCalledWith(
            { id: 'cust-1' },
            { profileSummary: 'Loyal buyer.' }
        );
    });

    it('does not mutate tags or summary after a malformed classifier response', async () => {
        httpService.post.mockReturnValue(
            of({ data: { data: { unexpected: true } } })
        );

        await expect(service.handle(dto() as any, 0)).resolves.toBeUndefined();
        expect(customerTagAssignmentService.apply).not.toHaveBeenCalled();
        expect(customerTagAssignmentService.remove).not.toHaveBeenCalled();
        expect(customerRepository.updateEntity).not.toHaveBeenCalled();
    });

    it('skips conversations without a customer or conversations that were deleted', async () => {
        conversationRepository.findOneById.mockResolvedValueOnce(
            liveConversation({ contactPoint: { customer: null } })
        );
        await expect(service.handle(dto() as any, 0)).resolves.toBeUndefined();
        expect(httpService.post).not.toHaveBeenCalled();

        conversationRepository.findOneById.mockResolvedValueOnce(null);
        await expect(service.handle(dto() as any, 0)).resolves.toBeUndefined();
        expect(httpService.post).not.toHaveBeenCalled();
    });

    it('throws classifier failures before the final Cloud Tasks attempt', async () => {
        const error = new Error('apps/ai 500');
        httpService.post.mockReturnValue(throwError(() => error));

        await expect(
            service.handle(
                dto() as any,
                CUSTOMER_TAG_CLASSIFIER_MAX_ATTEMPTS - 2
            )
        ).rejects.toBe(error);
        expect(Sentry.captureException).not.toHaveBeenCalled();
    });

    // A throw here let Cloud Tasks retry past the limit, an LLM call each
    // time (same as #170); the final attempt is acknowledged instead.
    it('captures Sentry and stops retrying on the final attempt', async () => {
        const error = new Error('apps/ai 500');
        httpService.post.mockReturnValue(throwError(() => error));

        await expect(
            service.handle(
                dto() as any,
                CUSTOMER_TAG_CLASSIFIER_MAX_ATTEMPTS - 1
            )
        ).resolves.toBeUndefined();
        expect(Sentry.captureException).toHaveBeenCalledWith(error, {
            tags: {
                queue: CUSTOMER_TAG_CLASSIFIER_SENTRY_QUEUE,
                conversation_id: 'conv-1',
            },
        });
    });

    // #250: the classifier's model call is metered like a reply.
    describe('usage meter', () => {
        const meter = { check: jest.fn(), record: jest.fn() };

        beforeEach(() => {
            meter.record.mockResolvedValue(undefined);
            conversationRepository.findOneById.mockResolvedValue(
                liveConversation({
                    chatbot: { id: 'bot-1', workspace: { id: 'ws-1' } },
                })
            );
            service = new CustomerTagClassifierTaskService(
                conversationRepository as any,
                messageRepository as any,
                customerRepository as any,
                customerTagService as any,
                customerTagAssignmentService as any,
                classifierService as any,
                httpService as any,
                configService as any,
                meter as any
            );
        });

        it('records what the classification spent', async () => {
            meter.check.mockResolvedValue({ allowed: true });
            httpService.post.mockReturnValue(
                classifierResponse({
                    profile_summary: 'Buyer.',
                    usage: {
                        input_tokens: 300,
                        output_tokens: 40,
                        total_tokens: 340,
                    },
                    model: 'google/gemini-2.5-flash',
                })
            );

            await service.handle(dto() as any, 0);

            expect(meter.check).toHaveBeenCalledWith(
                'ws-1',
                expect.objectContaining({ id: 'bot-1' })
            );
            expect(meter.record).toHaveBeenCalledWith({
                workspaceId: 'ws-1',
                usage: { inputTokens: 300, outputTokens: 40, totalTokens: 340 },
                source: ENUM_AI_USAGE_SOURCE.TAG_CLASSIFIER,
                chatbotId: 'bot-1',
                model: 'google/gemini-2.5-flash',
                conversationId: 'conv-1',
            });
        });

        it('still applies the tags and summary when recording the usage fails', async () => {
            meter.check.mockResolvedValue({ allowed: true });
            meter.record.mockRejectedValue(new Error('db down'));
            httpService.post.mockReturnValue(
                classifierResponse({
                    profile_summary: 'Buyer.',
                    usage: {
                        input_tokens: 1,
                        output_tokens: 1,
                        total_tokens: 2,
                    },
                })
            );

            await expect(
                service.handle(dto() as any, 0)
            ).resolves.toBeUndefined();

            expect(customerRepository.updateEntity).toHaveBeenCalled();
        });

        it('skips the classification silently when the workspace is out of tokens', async () => {
            meter.check.mockResolvedValue({
                allowed: false,
                reason: 'QUOTA_EXHAUSTED',
            });

            await expect(
                service.handle(dto() as any, 0)
            ).resolves.toBeUndefined();

            expect(httpService.post).not.toHaveBeenCalled();
            expect(meter.record).not.toHaveBeenCalled();
            expect(customerRepository.updateEntity).not.toHaveBeenCalled();
        });
    });
});
