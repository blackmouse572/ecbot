import { PassThrough, Readable } from 'stream';
import { ChatbotAiSseStreamService } from '../../../../src/modules/chatbot/services/chatbot-ai-sse-stream.service';
import { TokenUsageDelta } from '../../../../src/modules/chatbot/interfaces/token-usage-wire.interface';

const line = (part: object) => `data: ${JSON.stringify(part)}\n`;

/** Minimal Express-response stand-in: a writable that records header calls. */
function makeRes(): any {
    const res: any = new PassThrough();
    res.setHeader = jest.fn();
    res.flushHeaders = jest.fn();
    return res;
}

function upstreamOf(lines: string[]): any {
    return Readable.from(lines.map(l => Buffer.from(l)));
}

describe('ChatbotAiSseStreamService', () => {
    const usageLine = (usage: object) =>
        line({ type: 'message-metadata', messageMetadata: { usage } });

    it('reports usage to onUsage and text to onFinalize', async () => {
        const service = new ChatbotAiSseStreamService();
        let finalized: string | undefined;
        let reported: TokenUsageDelta | undefined;

        await service.pipe({
            res: makeRes(),
            upstream: upstreamOf([
                line({ type: 'text-delta', id: 't1', delta: 'hello' }),
                usageLine({
                    input_tokens: 9,
                    output_tokens: 1,
                    total_tokens: 10,
                }),
                line({ type: 'finish' }),
            ]),
            abort: new AbortController(),
            logContext: 'test',
            onFinalize: async text => {
                finalized = text;
            },
            onUsage: async usage => {
                reported = usage;
            },
        });

        expect(finalized).toBe('hello');
        expect(reported).toEqual({
            inputTokens: 9,
            outputTokens: 1,
            totalTokens: 10,
        });
    });

    // The tokens were burned before the guardrail verdict landed: the reply is
    // dropped, the bill is not.
    it('reports usage even when the reply is not persistable', async () => {
        const service = new ChatbotAiSseStreamService();
        const onFinalize = jest.fn();
        let reported: TokenUsageDelta | undefined;

        await service.pipe({
            res: makeRes(),
            upstream: upstreamOf([
                line({ type: 'text-delta', id: 't1', delta: 'blocked' }),
                usageLine({
                    input_tokens: 4,
                    output_tokens: 2,
                    total_tokens: 6,
                }),
                line({ type: 'data-guardrail', data: { reason: 'policy' } }),
            ]),
            abort: new AbortController(),
            logContext: 'test',
            onFinalize,
            onUsage: async usage => {
                reported = usage;
            },
        });

        expect(onFinalize).not.toHaveBeenCalled();
        expect(reported?.totalTokens).toBe(6);
    });

    it('skips onUsage when apps/ai reports no usage', async () => {
        const service = new ChatbotAiSseStreamService();
        const onUsage = jest.fn();

        await service.pipe({
            res: makeRes(),
            upstream: upstreamOf([
                line({ type: 'text-delta', id: 't1', delta: 'hello' }),
                line({ type: 'finish' }),
            ]),
            abort: new AbortController(),
            logContext: 'test',
            onFinalize: async () => {},
            onUsage,
        });

        expect(onUsage).not.toHaveBeenCalled();
    });

    // Metering must never take the reply down with it.
    it('still finalizes the text when onUsage throws', async () => {
        const service = new ChatbotAiSseStreamService();
        let finalized: string | undefined;

        await service.pipe({
            res: makeRes(),
            upstream: upstreamOf([
                line({ type: 'text-delta', id: 't1', delta: 'hello' }),
                usageLine({ input_tokens: 1, output_tokens: 1 }),
                line({ type: 'finish' }),
            ]),
            abort: new AbortController(),
            logContext: 'test',
            onFinalize: async text => {
                finalized = text;
            },
            onUsage: async () => {
                throw new Error('metering down');
            },
        });

        expect(finalized).toBe('hello');
    });

    describe('customer audience (website widget)', () => {
        // Customers see the answer, never how it was produced: no tool names
        // or results, knowledge searches, sources, reasoning or usage.
        const turn = [
            line({ type: 'start', messageId: 'm1' }),
            line({ type: 'data-knowledge', data: { count: 2 } }),
            line({ type: 'reasoning-start', id: 'r' }),
            line({ type: 'reasoning-delta', id: 'r', delta: 'checking stock' }),
            line({ type: 'reasoning-end', id: 'r' }),
            line({ type: 'start-step' }),
            line({
                type: 'tool-input-start',
                toolCallId: 'c1',
                toolName: 'get_stock',
            }),
            line({
                type: 'tool-input-available',
                toolCallId: 'c1',
                toolName: 'get_stock',
                input: {},
            }),
            line({ type: 'data-tool-meta', id: 'c1', data: { kind: 'mcp' } }),
            line({
                type: 'tool-output-available',
                toolCallId: 'c1',
                output: { internal_note: 'VIP' },
            }),
            line({ type: 'finish-step' }),
            line({
                type: 'file',
                url: 'https://cdn/s.jpg',
                mediaType: 'image/*',
            }),
            line({ type: 'text-start', id: 't1' }),
            line({ type: 'text-delta', id: 't1', delta: 'Còn hàng' }),
            line({ type: 'text-end', id: 't1' }),
            line({
                type: 'source-url',
                sourceId: 'KB-1',
                url: 'https://shop/faq',
            }),
            usageLine({ input_tokens: 9, output_tokens: 1, total_tokens: 10 }),
            line({ type: 'finish' }),
        ];

        const run = async (audience?: 'owner' | 'customer') => {
            const res = makeRes();
            let out = '';
            res.on('data', (c: Buffer) => (out += c.toString()));
            let finalized: string | undefined;
            let images: string[] = [];
            let reported: TokenUsageDelta | undefined;
            await new ChatbotAiSseStreamService().pipe({
                res,
                upstream: upstreamOf(turn),
                abort: new AbortController(),
                logContext: 'test',
                audience,
                onFinalize: async (text, imgs) => {
                    finalized = text;
                    images = imgs;
                },
                onUsage: async usage => {
                    reported = usage;
                },
            });
            const types = out
                .split('\n')
                .filter(l => l.startsWith('data: '))
                .map(l => JSON.parse(l.slice(6)).type as string);
            return { types, out, finalized, images, reported };
        };

        it('sends the customer only the reply and its public web links', async () => {
            const { types, out } = await run('customer');
            expect(types).toEqual([
                'start',
                'start-step',
                'finish-step',
                'file',
                'text-start',
                'text-delta',
                'text-end',
                'source-url',
                'finish',
            ]);
            expect(out).not.toContain('get_stock');
            expect(out).not.toContain('internal_note');
        });

        it('still saves the reply and meters the tokens', async () => {
            const { finalized, images, reported } = await run('customer');
            expect(finalized).toBe('Còn hàng');
            expect(images).toEqual(['https://cdn/s.jpg']);
            expect(reported).toEqual({
                inputTokens: 9,
                outputTokens: 1,
                totalTokens: 10,
            });
        });

        it('sends the owner everything', async () => {
            const { types } = await run();
            expect(types).toHaveLength(turn.length);
        });
    });
});
