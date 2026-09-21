import { ReplyGenerationService } from '../../../../src/modules/platform/services/reply-generation.service';
import { StreamingDelivery } from '../../../../src/modules/platform/services/streaming-delivery.service';
import { ormStub } from '../../../helpers/orm-stub';

/** Build a fake SSE stream that emits each part object as a data line, then fires 'end'. */
function makeStream(events: Array<Record<string, unknown>>) {
    const handlers: Record<string, ((...a: any[]) => void)[]> = {};
    const stream: any = {
        on(event: string, fn: any) {
            (handlers[event] ||= []).push(fn);
            return stream;
        },
    };
    setImmediate(() => {
        for (const e of events) {
            const line = `data: ${JSON.stringify(e)}\n`;
            handlers['data']?.forEach(fn => fn(Buffer.from(line)));
        }
        handlers['end']?.forEach(fn => fn());
    });
    return stream;
}

describe('ReplyGenerationService — guardrail block handling', () => {
    let service: ReplyGenerationService;
    let streaming: StreamingDelivery;
    let mockConversationService: any;
    let mockAdapter: any;
    let mockMessageRepo: any;

    beforeEach(() => {
        mockConversationService = {
            triggerHandoff: jest.fn().mockResolvedValue(undefined),
            recordFallback: jest.fn(),
        };
        // Flat adapter mock: StreamingDelivery and handleGuardrailBlock both call adapter.sendMessage directly
        mockAdapter = {
            sendMessage: jest.fn().mockResolvedValue({ externalId: 'ext-1' }),
        };
        mockMessageRepo = {
            insertPendingOutbound: jest
                .fn()
                .mockResolvedValue({ clientNonce: 'n' }),
            markOutboundSent: jest.fn().mockResolvedValue(undefined),
            markOutboundFailed: jest.fn().mockResolvedValue(undefined),
        };
        streaming = new StreamingDelivery();
        const mockModuleRef = { get: jest.fn(() => mockConversationService) };
        service = new ReplyGenerationService(
            {} as any, // accountService
            {} as any, // chatbotAIService
            mockMessageRepo,
            { get: () => mockAdapter } as any, // registry
            {} as any, // lease
            streaming,
            mockModuleRef as any,
            ormStub(),
            {} as any // manifestBuilder
        );
    });

    // consumeStream moved to StreamingDelivery — test it there directly
    it('consumeStream returns guardrailBlocked=true on data-guardrail part', async () => {
        const stream = makeStream([
            {
                type: 'data-guardrail',
                data: { reason: 'guardrail_input_heuristic' },
            },
            { type: 'finish' },
        ]);
        const ac = new AbortController();
        const result = await (streaming as any).consumeStream(
            stream,
            ac,
            async () => true
        );
        expect(result.guardrailBlocked).toBe(true);
        expect(result.guardrailReason).toBe('guardrail_input_heuristic');
        expect(result.segments).toHaveLength(0);
    });

    it('does not call recordFallback on a guardrail block', async () => {
        const stream = makeStream([
            {
                type: 'data-guardrail',
                data: { reason: 'guardrail_output_custom' },
            },
            { type: 'finish' },
        ]);
        const ac = new AbortController();
        const result = await (streaming as any).consumeStream(
            stream,
            ac,
            async () => true
        );
        expect(result.guardrailBlocked).toBe(true);
        expect(mockConversationService.recordFallback).not.toHaveBeenCalled();
    });

    it('discards accumulated text segments when guardrail-block fires', async () => {
        const stream = makeStream([
            { type: 'text-delta', id: 't1', delta: 'This should be discarded' },
            {
                type: 'data-guardrail',
                data: { reason: 'guardrail_input_heuristic' },
            },
            { type: 'finish' },
        ]);
        const ac = new AbortController();
        const result = await (streaming as any).consumeStream(
            stream,
            ac,
            async () => true
        );
        expect(result.guardrailBlocked).toBe(true);
        expect(result.segments).toHaveLength(0);
    });

    it('sends fallbackMessage to platform on guardrail block', async () => {
        const chatbot = {
            id: 'bot-1',
            fallbackMessage: 'Sorry, I cannot help with that.',
            guardrailEscalateOnBlock: false,
            handoffMessage: null,
            workspace: { id: 'ws-1' },
        };
        const senderId = 'sender-1';
        const account = { id: 'acc-1' };
        const conversation = { id: 'conv-1' };
        await (service as any).handleGuardrailBlock(
            'guardrail_input_heuristic',
            chatbot,
            account,
            senderId,
            conversation
        );
        expect(mockAdapter.sendMessage).toHaveBeenCalledWith(
            account,
            senderId,
            expect.objectContaining({
                content: {
                    kind: 'text',
                    text: 'Sorry, I cannot help with that.',
                },
            })
        );
        expect(mockConversationService.triggerHandoff).not.toHaveBeenCalled();
    });

    it('triggers handoff when guardrailEscalateOnBlock is true', async () => {
        const chatbot = {
            id: 'bot-1',
            fallbackMessage: 'Sorry.',
            guardrailEscalateOnBlock: true,
            handoffMessage: 'Connecting you to a human.',
            workspace: { id: 'ws-1' },
        };
        const conversation = { id: 'conv-1' };
        await (service as any).handleGuardrailBlock(
            'guardrail_output_model',
            chatbot,
            { id: 'acc-1' },
            'sender-1',
            conversation
        );
        expect(mockConversationService.triggerHandoff).toHaveBeenCalledWith(
            conversation,
            'ws-1',
            'guardrail_output_model',
            'Connecting you to a human.'
        );
    });

    it('does not send fallbackMessage or trigger handoff when fallbackMessage is absent', async () => {
        const chatbot = {
            id: 'bot-1',
            fallbackMessage: null,
            guardrailEscalateOnBlock: false,
            handoffMessage: null,
            workspace: { id: 'ws-1' },
        };
        await (service as any).handleGuardrailBlock(
            'guardrail_input_heuristic',
            chatbot,
            { id: 'acc-1' },
            'sender-1',
            { id: 'conv-1' }
        );
        expect(mockAdapter.sendMessage).not.toHaveBeenCalled();
        expect(mockConversationService.triggerHandoff).not.toHaveBeenCalled();
        expect(mockMessageRepo.insertPendingOutbound).not.toHaveBeenCalled();
    });

    it('does not send fallbackMessage but triggers handoff when fallbackMessage=null and guardrailEscalateOnBlock=true', async () => {
        const chatbot = {
            id: 'bot-1',
            fallbackMessage: null,
            guardrailEscalateOnBlock: true,
            handoffMessage: 'Connecting you to a human.',
            workspace: { id: 'ws-1' },
        };
        await (service as any).handleGuardrailBlock(
            'guardrail_output_model',
            chatbot,
            { id: 'acc-1' },
            'sender-1',
            { id: 'conv-1' }
        );
        expect(mockAdapter.sendMessage).not.toHaveBeenCalled();
        expect(mockConversationService.triggerHandoff).toHaveBeenCalledWith(
            { id: 'conv-1' },
            'ws-1',
            'guardrail_output_model',
            'Connecting you to a human.'
        );
    });
});
