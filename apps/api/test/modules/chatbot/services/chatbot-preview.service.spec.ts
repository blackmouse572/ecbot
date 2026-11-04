// apps/api/test/modules/chatbot/services/chatbot-preview.service.spec.ts
import { Readable, PassThrough } from 'stream';
import { ChatbotAiSseStreamService } from '../../../../src/modules/chatbot/services/chatbot-ai-sse-stream.service';
import { ChatbotPreviewService } from '../../../../src/modules/chatbot/services/chatbot-preview.service';

type FakeRes = PassThrough & {
    setHeader: jest.Mock;
    flushHeaders: jest.Mock;
    headers: Record<string, string>;
};

function fakeRes(): FakeRes {
    const res = new PassThrough() as FakeRes;
    res.headers = {};
    res.setHeader = jest.fn((k: string, v: string) => {
        res.headers[k] = v;
    });
    res.flushHeaders = jest.fn();
    return res;
}

function frames(...parts: string[]): string {
    return parts.map(p => `data: ${p}\n\n`).join('') + 'data: [DONE]\n\n';
}

function setup(
    upstreamBody: string | { fail: true },
    sessionOverrides: Record<string, unknown> = {}
) {
    const captured: { params?: Record<string, unknown>; signal?: AbortSignal } =
        {};
    const upstream = new PassThrough();

    const aiService = {
        streamChat: jest.fn(
            async (params: Record<string, unknown>, signal: AbortSignal) => {
                captured.params = params;
                captured.signal = signal;
                if (typeof upstreamBody !== 'string') {
                    throw new Error('ai backend down');
                }
                return upstream as unknown as Readable;
            }
        ),
    };

    const sessionService = {
        read: jest.fn(async () => []),
        writeTurn: jest.fn(async () => {}),
        ...sessionOverrides,
    };

    // The real SSE pump, not a mock — these assertions cover its behaviour
    // (headers, abort, finalize) and must keep doing so after the extraction.
    const meter = {
        check: jest.fn().mockResolvedValue({ allowed: true }),
        record: jest.fn(),
    };

    const media = {
        notes: jest.fn(async () => ({
            notes: ['[Image description: a red shirt]'],
            usage: { inputTokens: 300, outputTokens: 40, totalTokens: 340 },
            model: 'google/gemini-2.5-flash',
        })),
    };

    const service = new ChatbotPreviewService(
        aiService as never,
        sessionService as never,
        new ChatbotAiSseStreamService(),
        media as never,
        meter as never
    );

    /** No meter at all — the public build, where metering is absent. */
    const unmetered = new ChatbotPreviewService(
        aiService as never,
        sessionService as never,
        new ChatbotAiSseStreamService(),
        media as never
    );

    return {
        service,
        unmetered,
        aiService,
        sessionService,
        upstream,
        captured,
        meter,
        media,
    };
}

const chatbot = {
    id: 'cb1',
    modelProvider: 'openai',
    modelTextName: 'openai/gpt-4o-mini',
    workspace: { id: 'ws1' },
} as never;

const baseParams = {
    chatbot,
    sessionKey: 'k',
    message: 'hello',
    userId: 'u1',
};

describe('ChatbotPreviewService.streamTo', () => {
    it('sends the stored history to the AI backend', async () => {
        const history = [{ role: 'user' as const, content: 'earlier' }];
        const { service, upstream, captured } = setup(frames(), {
            read: jest.fn(async () => history),
        });
        const res = fakeRes();

        const done = service.streamTo(res as never, baseParams);
        upstream.end(frames('{"type":"text-delta","id":"t1","delta":"hi"}'));
        await done;

        expect(captured.params).toMatchObject({
            chatbot_id: 'cb1',
            message: 'hello',
            history,
        });
    });

    it('sets SSE headers before streaming', async () => {
        const { service, upstream } = setup(frames());
        const res = fakeRes();

        const done = service.streamTo(res as never, baseParams);
        upstream.end(frames());
        await done;

        expect(res.headers['Content-Type']).toBe('text/event-stream');
        expect(res.headers['x-vercel-ai-ui-message-stream']).toBe('v1');
        expect(res.flushHeaders).toHaveBeenCalled();
    });

    it('persists the completed turn once the stream finishes', async () => {
        const { service, sessionService, upstream } = setup(frames());
        const res = fakeRes();

        const done = service.streamTo(res as never, baseParams);
        upstream.end(
            frames(
                '{"type":"text-delta","id":"t1","delta":"Xin "}',
                '{"type":"text-delta","id":"t1","delta":"chao"}'
            )
        );
        await done;

        expect(sessionService.writeTurn).toHaveBeenCalledTimes(1);
        expect(sessionService.writeTurn).toHaveBeenCalledWith(
            'k',
            'hello',
            'Xin chao'
        );
    });

    it('forwards the sanitized stream to the client', async () => {
        const { service, upstream } = setup(frames());
        const res = fakeRes();
        let out = '';
        res.on('data', (c: Buffer) => (out += c.toString()));

        const done = service.streamTo(res as never, baseParams);
        upstream.end(
            frames(
                '{"type":"error","errorText":"[agent error: Error code: 402 - secret]"}'
            )
        );
        await done;

        expect(out).toContain('"type":"error"');
        expect(out).not.toContain('secret');
    });

    // apps/ai emits the output guardrail after the text has already streamed.
    it('does not persist a reply that a guardrail blocked', async () => {
        const { service, sessionService, upstream } = setup(frames());
        const res = fakeRes();

        const done = service.streamTo(res as never, baseParams);
        upstream.end(
            frames(
                '{"type":"text-delta","id":"t1","delta":"blocked"}',
                '{"type":"data-guardrail","data":{"reason":"policy"}}'
            )
        );
        await done;

        expect(sessionService.writeTurn).not.toHaveBeenCalled();
    });

    it('does not persist a partial reply that errored', async () => {
        const { service, sessionService, upstream } = setup(frames());
        const res = fakeRes();

        const done = service.streamTo(res as never, baseParams);
        upstream.end(
            frames(
                '{"type":"text-delta","id":"t1","delta":"partial"}',
                '{"type":"error","errorText":"boom"}'
            )
        );
        await done;

        expect(sessionService.writeTurn).not.toHaveBeenCalled();
    });

    // Without an AbortSignal the upstream keeps generating after the browser
    // leaves, burning tokens until the 300s request timeout.
    it('aborts the upstream when the client disconnects', async () => {
        const { service, captured, upstream } = setup(frames());
        const res = fakeRes();

        const done = service.streamTo(res as never, baseParams);
        upstream.write('data: {"type":"text-delta","id":"t1","delta":"a"}\n\n');
        await new Promise(r => setImmediate(r));
        res.destroy();
        await done;

        expect(captured.signal?.aborted).toBe(true);
    });

    it('finalizes exactly once even when the client disconnects', async () => {
        const { service, sessionService, upstream } = setup(frames());
        const res = fakeRes();

        const done = service.streamTo(res as never, baseParams);
        upstream.write('data: {"type":"text-delta","id":"t1","delta":"a"}\n\n');
        await new Promise(r => setImmediate(r));
        res.destroy();
        await done;

        expect(sessionService.writeTurn.mock.calls.length).toBeLessThanOrEqual(
            1
        );
    });

    it('throws before writing headers when the AI backend is unreachable', async () => {
        const { service, sessionService } = setup({ fail: true });
        const res = fakeRes();

        await expect(
            service.streamTo(res as never, baseParams)
        ).rejects.toMatchObject({
            response: { message: 'chatbot.error.aiBackendUnavailable' },
        });
        expect(res.flushHeaders).not.toHaveBeenCalled();
        expect(sessionService.writeTurn).not.toHaveBeenCalled();
    });
});

describe('ChatbotPreviewService token budget', () => {
    // An operator is staff: tell them the budget ran out instead of handing
    // back a fake reply they would debug as a broken bot.
    it('raises instead of generating when the budget is spent', async () => {
        const { service, meter, aiService } = setup(frames());
        meter.check.mockResolvedValue({
            allowed: false,
            reason: 'QUOTA_EXHAUSTED',
        });

        await expect(
            service.streamTo(fakeRes() as never, baseParams)
        ).rejects.toMatchObject({ status: 422 });
        expect(aiService.streamChat).not.toHaveBeenCalled();
    });

    // Public build: no meter is wired, so the turn runs and books nothing.
    it('streams the reply when no meter is wired', async () => {
        const { unmetered, upstream, aiService } = setup(frames());
        const res = fakeRes();
        let out = '';
        res.on('data', (c: Buffer) => (out += c.toString()));

        const done = unmetered.streamTo(res as never, baseParams);
        upstream.end(frames('{"type":"text-delta","id":"t1","delta":"hi"}'));
        await done;

        expect(aiService.streamChat).toHaveBeenCalled();
        expect(out).toContain('text-delta');
    });

    it('records preview usage against the chatbot workspace', async () => {
        const { service, upstream, meter } = setup(frames());
        const res = fakeRes();
        const done = service.streamTo(res as never, baseParams);
        upstream.write(
            'data: {"type":"message-metadata","messageMetadata":{"usage":{"input_tokens":8,"output_tokens":4,"total_tokens":12}}}\n\n'
        );
        upstream.end();
        await done;

        expect(meter.record).toHaveBeenCalledWith(
            expect.objectContaining({
                workspaceId: 'ws1',
                chatbotId: 'cb1',
                source: 'PREVIEW',
            })
        );
    });
});

describe('ChatbotPreviewService model label', () => {
    // `modelProvider` is derived from the OpenRouter id's prefix
    // (chatbot.service.ts), so `${provider}/${textName}` doubles it —
    // "openai/openai/gpt-4o-mini". The text name is already the full id.
    it('records the model id without duplicating the provider', async () => {
        const { service, upstream, meter } = setup(frames());
        const res = fakeRes();
        const done = service.streamTo(res as never, baseParams);
        upstream.write(
            'data: {"type":"message-metadata","messageMetadata":{"usage":{"input_tokens":8,"output_tokens":4,"total_tokens":12}}}\n\n'
        );
        upstream.end();
        await done;

        expect(meter.record).toHaveBeenCalledWith(
            expect.objectContaining({ model: 'openai/gpt-4o-mini' })
        );
    });
});

describe('ChatbotPreviewService attachments', () => {
    const attachments = [{ key: 'preview-media/cb1/a.jpg' }];

    it('sends the attachment notes after the text and remembers them', async () => {
        const { service, upstream, captured, sessionService, media } =
            setup(frames());
        const res = fakeRes();
        const done = service.streamTo(res as never, {
            ...baseParams,
            message: 'how much is this?',
            attachments,
        });
        upstream.end(frames('{"type":"text-delta","id":"t1","delta":"99k"}'));
        await done;

        expect(media.notes).toHaveBeenCalledWith('cb1', attachments);
        const message = 'how much is this?\n[Image description: a red shirt]';
        expect(captured.params).toMatchObject({ message });
        expect(sessionService.writeTurn).toHaveBeenCalledWith(
            'k',
            message,
            '99k'
        );
    });

    it('takes a message that is only attachments', async () => {
        const { service, upstream, captured } = setup(frames());
        const done = service.streamTo(fakeRes() as never, {
            ...baseParams,
            message: '',
            attachments,
        });
        upstream.end(frames());
        await done;

        expect(captured.params).toMatchObject({
            message: '[Image description: a red shirt]',
        });
    });

    it('records the description at the vision model', async () => {
        const { service, upstream, meter } = setup(frames());
        const done = service.streamTo(fakeRes() as never, {
            ...baseParams,
            attachments,
        });
        upstream.end(frames());
        await done;

        expect(meter.record).toHaveBeenCalledWith(
            expect.objectContaining({
                source: 'PREVIEW',
                model: 'google/gemini-2.5-flash',
                usage: expect.objectContaining({ inputTokens: 300 }),
            })
        );
    });

    it('refuses a message with no text and no attachments', async () => {
        const { service, aiService } = setup(frames());
        await expect(
            service.streamTo(fakeRes() as never, {
                ...baseParams,
                message: '  ',
            })
        ).rejects.toThrow();
        expect(aiService.streamChat).not.toHaveBeenCalled();
    });

    it('refuses a message whose attachments were all dropped', async () => {
        const { service, aiService, media } = setup(frames());
        media.notes.mockResolvedValueOnce({ notes: [] } as never);
        await expect(
            service.streamTo(fakeRes() as never, {
                ...baseParams,
                message: '',
                attachments: [{ key: 'preview-media/cb2/a.jpg' }],
            })
        ).rejects.toThrow();
        expect(aiService.streamChat).not.toHaveBeenCalled();
    });
});

// The /client preview (MCP test_chatbot): same turn, but answered as one JSON
// body instead of an SSE stream.
describe('ChatbotPreviewService.reply', () => {
    it('returns the whole reply with the tools it called', async () => {
        const { service, upstream } = setup(frames());

        const done = service.reply(baseParams);
        upstream.end(
            frames(
                '{"type":"tool-input-available","toolCallId":"a","toolName":"search_knowledge","input":{"query":"COD"}}',
                '{"type":"tool-output-available","toolCallId":"a","output":{}}',
                '{"type":"text-delta","id":"t1","delta":"Có "}',
                '{"type":"text-delta","id":"t1","delta":"ạ"}'
            )
        );

        await expect(done).resolves.toEqual({
            reply: 'Có ạ',
            media: [],
            toolCalls: [{ name: 'search_knowledge', input: { query: 'COD' } }],
            blocked: false,
        });
    });

    it('keeps the turn in the session like the streamed preview', async () => {
        const { service, sessionService, upstream } = setup(frames());

        const done = service.reply(baseParams);
        upstream.end(frames('{"type":"text-delta","id":"t1","delta":"hi"}'));
        await done;

        expect(sessionService.writeTurn).toHaveBeenCalledWith(
            'k',
            'hello',
            'hi'
        );
    });

    it('records preview usage', async () => {
        const { service, meter, upstream } = setup(frames());

        const done = service.reply(baseParams);
        upstream.end(
            frames(
                '{"type":"text-delta","id":"t1","delta":"hi"}',
                '{"type":"message-metadata","messageMetadata":{"usage":{"input_tokens":10,"output_tokens":2,"total_tokens":12}}}'
            )
        );
        await done;

        expect(meter.record).toHaveBeenCalledWith(
            expect.objectContaining({ workspaceId: 'ws1', chatbotId: 'cb1' })
        );
    });

    it('says a guardrail blocked the reply and keeps nothing', async () => {
        const { service, sessionService, upstream } = setup(frames());

        const done = service.reply(baseParams);
        upstream.end(
            frames(
                '{"type":"text-delta","id":"t1","delta":"bad"}',
                '{"type":"data-guardrail","data":{"reason":"policy"}}'
            )
        );

        await expect(done).resolves.toMatchObject({ blocked: true });
        expect(sessionService.writeTurn).not.toHaveBeenCalled();
    });

    it('throws when the generation fails, without the raw error', async () => {
        const { service, sessionService, upstream } = setup(frames());

        const done = service.reply(baseParams);
        upstream.end(
            frames(
                '{"type":"text-delta","id":"t1","delta":"part"}',
                '{"type":"error","errorText":"[agent error: secret]"}'
            )
        );

        await expect(done).rejects.toMatchObject({
            response: { message: 'chatbot.error.aiBackendUnavailable' },
        });
        expect(sessionService.writeTurn).not.toHaveBeenCalled();
    });
});

describe('ChatbotPreviewService.reply transport', () => {
    // A dropped apps/ai socket sends no error frame: without this the half
    // reply would come back as a whole one and land in the session.
    it('throws and keeps nothing when the upstream dies mid-reply', async () => {
        const { service, sessionService, upstream } = setup(frames());

        const done = service.reply(baseParams);
        upstream.write(
            'data: {"type":"text-delta","id":"t1","delta":"half"}\n\n'
        );
        await new Promise(r => setImmediate(r));
        upstream.destroy(new Error('socket hang up'));

        await expect(done).rejects.toMatchObject({
            response: { message: 'chatbot.error.aiBackendUnavailable' },
        });
        expect(sessionService.writeTurn).not.toHaveBeenCalled();
    });

    it('stops apps/ai when the caller goes away', async () => {
        const { service, captured, upstream } = setup(frames());
        const caller = new AbortController();

        const done = service.reply({ ...baseParams, signal: caller.signal });
        await new Promise(r => setImmediate(r));
        caller.abort();
        upstream.destroy();
        await done.catch(() => undefined);

        expect(captured.signal?.aborted).toBe(true);
    });
});
