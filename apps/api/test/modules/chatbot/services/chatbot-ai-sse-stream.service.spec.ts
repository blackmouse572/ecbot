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
});
