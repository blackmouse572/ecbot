import { Readable } from 'stream';
import {
    StreamingDelivery,
    guardrailDeliveryPolicy,
    outputHeuristic,
} from '../../../src/modules/platform/services/streaming-delivery.service';
import { ENUM_CONVERSATION_ACTIVITY_KIND } from '../../../src/modules/conversation/enums/conversation-activity.enum';

const GUARD_OFF = {
    guardrailEnabled: false,
    guardrailModelEnabled: false,
};
const GUARD_HEURISTIC = {
    guardrailEnabled: true,
    guardrailModelEnabled: false,
};

function sse(lines: string[]): any {
    const r = Readable.from(lines.map(l => Buffer.from(l)));
    return r;
}
const line = (part: object) => `data: ${JSON.stringify(part)}\n`;
const DONE = 'data: [DONE]\n';

function makeAdapter() {
    return {
        sendMessage: jest.fn().mockResolvedValue({ externalId: 'ext' }),
    } as any;
}

describe('StreamingDelivery.deliver (UI Message Stream)', () => {
    it('splits segments at tool-input-start and sends each', async () => {
        const adapter = makeAdapter();
        const sd = new StreamingDelivery();
        const persisted: string[] = [];
        const res = await sd.deliver({
            adapter,
            account: {} as any,
            senderId: 'S',
            conversationId: 'C',
            stream: sse([
                line({ type: 'start', messageId: 'm1' }),
                line({ type: 'text-start', id: 't1' }),
                line({ type: 'text-delta', id: 't1', delta: 'one' }),
                line({
                    type: 'tool-input-start',
                    toolCallId: 'inv1',
                    toolName: 'get_order',
                }),
                line({
                    type: 'tool-output-available',
                    toolCallId: 'inv1',
                    output: { ok: true },
                }),
                line({ type: 'text-start', id: 't2' }),
                line({ type: 'text-delta', id: 't2', delta: 'two' }),
                line({ type: 'finish' }),
                DONE,
            ]),
            abort: new AbortController(),
            isCurrent: async () => true,
            onSegmentPersist: async t => {
                persisted.push(t);
                return 'nonce';
            },
            onSent: async () => {},
            onFailed: async () => {},
        });
        expect(persisted).toEqual(['one', 'two']);
        expect(adapter.sendMessage).toHaveBeenCalledTimes(2);
        expect(res).toMatchObject({ anySent: true, superseded: false });
    });

    it.each([
        ['buffered', undefined],
        ['incremental', GUARD_OFF],
    ])(
        'reports a turn the agent ended without a reply (%s)',
        async (_path, chatbot) => {
            const adapter = makeAdapter();
            const res = await new StreamingDelivery().deliver({
                adapter,
                account: {} as any,
                senderId: 'S',
                conversationId: 'C',
                chatbot,
                stream: sse([
                    line({
                        type: 'tool-input-start',
                        toolCallId: 'c1',
                        toolName: 'end_without_reply',
                    }),
                    line({ type: 'finish' }),
                    DONE,
                ]),
                abort: new AbortController(),
                isCurrent: async () => true,
                onSegmentPersist: async () => 'nonce',
                onSent: async () => {},
                onFailed: async () => {},
            });
            expect(adapter.sendMessage).not.toHaveBeenCalled();
            expect(res).toMatchObject({
                anySent: false,
                endedWithoutReply: true,
            });
        }
    );

    // Text the model wrote in the same step, before the call, has already
    // streamed out and cannot be recalled: it is the reply, so the turn is
    // a normal one (no silence, no fallback). AGENT.md asks for no text.
    it('delivers text written before end_without_reply as the reply', async () => {
        const adapter = makeAdapter();
        const persisted: string[] = [];
        const res = await new StreamingDelivery().deliver({
            adapter,
            account: {} as any,
            senderId: 'S',
            conversationId: 'C',
            chatbot: GUARD_OFF,
            stream: sse([
                line({ type: 'text-start', id: 't1' }),
                line({ type: 'text-delta', id: 't1', delta: 'Thanks!' }),
                line({
                    type: 'tool-input-start',
                    toolCallId: 'c1',
                    toolName: 'end_without_reply',
                }),
                line({ type: 'finish' }),
                DONE,
            ]),
            abort: new AbortController(),
            isCurrent: async () => true,
            onSegmentPersist: async t => {
                persisted.push(t);
                return 'nonce';
            },
            onSent: async () => {},
            onFailed: async () => {},
        });
        expect(persisted).toEqual(['Thanks!']);
        expect(adapter.sendMessage).toHaveBeenCalledTimes(1);
        expect(res).toMatchObject({ anySent: true, endedWithoutReply: true });
    });

    it('stops sending when superseded (keeps already-sent)', async () => {
        let sent = 0;
        const adapter = {
            sendMessage: jest.fn().mockImplementation(async () => {
                sent++;
                return { externalId: 'ext' };
            }),
        } as any;
        const sd = new StreamingDelivery();
        const res = await sd.deliver({
            adapter,
            account: {} as any,
            senderId: 'S',
            conversationId: 'C',
            stream: sse([
                line({ type: 'text-delta', id: 't1', delta: 'one' }),
                line({
                    type: 'tool-input-start',
                    toolCallId: 'inv1',
                    toolName: 'get_order',
                }),
                line({ type: 'text-delta', id: 't2', delta: 'two' }),
            ]),
            abort: new AbortController(),
            // current until the first message has been sent; false thereafter
            isCurrent: async () => sent < 1,
            onSegmentPersist: async () => 'nonce',
            onSent: async () => {},
            onFailed: async () => {},
        });
        expect(adapter.sendMessage).toHaveBeenCalledTimes(1);
        expect(res.anySent).toBe(true);
        expect(res.superseded).toBe(true);
    });

    it('silently ignores a data:null primitive line and delivers valid segments', async () => {
        const adapter = makeAdapter();
        const sd = new StreamingDelivery();
        const persisted: string[] = [];
        const res = await sd.deliver({
            adapter,
            account: {} as any,
            senderId: 'S',
            conversationId: 'C',
            stream: sse([
                line({ type: 'text-delta', id: 't1', delta: 'hello' }),
                'data: null\n',
                line({ type: 'text-delta', id: 't1', delta: ' world' }),
                DONE,
            ]),
            abort: new AbortController(),
            isCurrent: async () => true,
            onSegmentPersist: async t => {
                persisted.push(t);
                return 'nonce';
            },
            onSent: async () => {},
            onFailed: async () => {},
        });
        expect(persisted).toEqual(['hello world']);
        expect(adapter.sendMessage).toHaveBeenCalledTimes(1);
        expect(res).toMatchObject({ anySent: true, superseded: false });
    });

    it('data-guardrail discards segments, blocks delivery, and captures the reason', async () => {
        const adapter = makeAdapter();
        const sd = new StreamingDelivery();
        const persisted: string[] = [];
        const res = await sd.deliver({
            adapter,
            account: {} as any,
            senderId: 'S',
            conversationId: 'C',
            stream: sse([
                line({ type: 'text-start', id: 't1' }),
                line({ type: 'text-delta', id: 't1', delta: 'partial' }),
                line({ type: 'data-guardrail', data: { reason: 'jailbreak' } }),
                line({ type: 'finish' }),
                DONE,
            ]),
            abort: new AbortController(),
            isCurrent: async () => true,
            onSegmentPersist: async t => {
                persisted.push(t);
                return 'nonce';
            },
            onSent: async () => {},
            onFailed: async () => {},
        });
        expect(persisted).toEqual([]);
        expect(adapter.sendMessage).not.toHaveBeenCalled();
        expect(res).toMatchObject({
            anySent: false,
            superseded: false,
            guardrailBlocked: true,
            guardrailReason: 'jailbreak',
        });
    });

    // Producer↔consumer contract test (#233): the SSE fixture below is the
    // exact frame sequence apps/ai (`stream_pipeline.events_to_ui_parts`)
    // now emits for a real text -> tool -> text turn, including the
    // `tool-input-start` part that apps/ai must emit for this segmentation
    // to fire. If apps/ai stops emitting `tool-input-start`, the mirrored
    // Python test (`test_chat_stream_parts.py::test_text_then_tool_roundtrip_emits_ordered_parts`)
    // fails too — both sides of the contract are pinned.
    it('contract: text -> tool -> text SSE fixture from apps/ai splits into two segments', async () => {
        const adapter = makeAdapter();
        const sd = new StreamingDelivery();
        const persisted: string[] = [];
        const res = await sd.deliver({
            adapter,
            account: {} as any,
            senderId: 'S',
            conversationId: 'C',
            stream: sse([
                line({ type: 'start', messageId: 'm1' }),
                line({ type: 'text-start', id: 'text-1' }),
                line({ type: 'text-delta', id: 'text-1', delta: 'before ' }),
                line({ type: 'text-delta', id: 'text-1', delta: 'tool' }),
                line({ type: 'text-end', id: 'text-1' }),
                line({ type: 'start-step' }),
                line({
                    type: 'tool-input-start',
                    toolCallId: 'r1',
                    toolName: 'get_order',
                }),
                line({
                    type: 'tool-input-available',
                    toolCallId: 'r1',
                    toolName: 'get_order',
                    input: { id: 7 },
                }),
                line({
                    type: 'tool-output-available',
                    toolCallId: 'r1',
                    output: { status: 'ok' },
                }),
                line({ type: 'finish-step' }),
                line({ type: 'text-start', id: 'text-2' }),
                line({ type: 'text-delta', id: 'text-2', delta: 'after tool' }),
                line({ type: 'text-end', id: 'text-2' }),
                line({ type: 'finish' }),
                DONE,
            ]),
            abort: new AbortController(),
            isCurrent: async () => true,
            onSegmentPersist: async t => {
                persisted.push(t);
                return 'nonce';
            },
            onSent: async () => {},
            onFailed: async () => {},
        });
        // Two segments = the tool-input-start delimiter fired.
        expect(persisted).toEqual(['before tool', 'after tool']);
        expect(persisted).toHaveLength(2);
        expect(adapter.sendMessage).toHaveBeenCalledTimes(2);
        expect(res).toMatchObject({ anySent: true, superseded: false });
    });

    it('plain text reply (no tool calls) yields a single segment', async () => {
        const adapter = makeAdapter();
        const sd = new StreamingDelivery();
        const persisted: string[] = [];
        const res = await sd.deliver({
            adapter,
            account: {} as any,
            senderId: 'S',
            conversationId: 'C',
            stream: sse([
                line({ type: 'text-start', id: 't1' }),
                line({ type: 'text-delta', id: 't1', delta: 'hello ' }),
                line({ type: 'text-delta', id: 't1', delta: 'world' }),
                line({ type: 'finish' }),
                DONE,
            ]),
            abort: new AbortController(),
            isCurrent: async () => true,
            onSegmentPersist: async t => {
                persisted.push(t);
                return 'nonce';
            },
            onSent: async () => {},
            onFailed: async () => {},
        });
        expect(persisted).toEqual(['hello world']);
        expect(adapter.sendMessage).toHaveBeenCalledTimes(1);
        expect(res).toMatchObject({ anySent: true, superseded: false });
    });

    // apps/ai's keepalive comment (sent while a turn is quiet) is not a part:
    // it must neither end up in the reply nor break it, on either path.
    it.each([
        ['buffered', undefined],
        ['incremental', GUARD_OFF],
    ])(
        'ignores keepalive comments between parts (%s)',
        async (_path, chatbot) => {
            const adapter = makeAdapter();
            const persisted: string[] = [];
            const res = await new StreamingDelivery().deliver({
                adapter,
                account: {} as any,
                senderId: 'S',
                conversationId: 'C',
                chatbot: chatbot as any,
                stream: sse([
                    line({ type: 'text-start', id: 't1' }),
                    ': keepalive\n',
                    '\n',
                    line({ type: 'text-delta', id: 't1', delta: 'hello ' }),
                    ': keepalive\n',
                    line({ type: 'text-delta', id: 't1', delta: 'world' }),
                    line({ type: 'finish' }),
                    DONE,
                ]),
                abort: new AbortController(),
                isCurrent: async () => true,
                onSegmentPersist: async t => {
                    persisted.push(t);
                    return 'nonce';
                },
                onSent: async () => {},
                onFailed: async () => {},
            });
            expect(persisted).toEqual(['hello world']);
            expect(res).toMatchObject({ anySent: true, superseded: false });
        }
    );

    it('reports an AI error frame without delivering partial text', async () => {
        const adapter = makeAdapter();
        const sd = new StreamingDelivery();
        const persisted: string[] = [];
        const res = await sd.deliver({
            adapter,
            account: {} as any,
            senderId: 'S',
            conversationId: 'C',
            stream: sse([
                line({ type: 'text-delta', id: 't1', delta: 'partial' }),
                line({ type: 'error', errorText: 'generation failed' }),
                DONE,
            ]),
            abort: new AbortController(),
            isCurrent: async () => true,
            onSegmentPersist: async t => {
                persisted.push(t);
                return 'nonce';
            },
            onSent: async () => {},
            onFailed: async () => {},
        });

        expect(res).toMatchObject({
            anySent: false,
            generationFailed: true,
        });
        expect(persisted).toEqual([]);
        expect(adapter.sendMessage).not.toHaveBeenCalled();
    });
});

describe('StreamingDelivery — product images', () => {
    it.each([
        ['buffered', undefined],
        ['incremental', GUARD_OFF],
    ])(
        "%s: an image inside a paragraph goes after that paragraph's text",
        async (_mode, chatbot) => {
            const adapter = makeAdapter();
            const persisted: { text: string; attachments?: unknown[] }[] = [];
            await new StreamingDelivery().deliver({
                adapter,
                account: {} as any,
                senderId: 'S',
                conversationId: 'C',
                chatbot,
                stream: sse([
                    line({
                        type: 'text-delta',
                        id: 't1',
                        delta: 'Here it is, ',
                    }),
                    line({
                        type: 'file',
                        url: 'https://cdn/shirt.jpg',
                        mediaType: 'image/*',
                    }),
                    line({ type: 'text-delta', id: 't1', delta: 'in white.' }),
                    line({ type: 'finish' }),
                    DONE,
                ]),
                abort: new AbortController(),
                isCurrent: async () => true,
                onSegmentPersist: async (text, attachments) => {
                    persisted.push({ text, attachments });
                    return 'nonce';
                },
                onSent: async () => {},
                onFailed: async () => {},
            });
            expect(persisted).toEqual([
                { text: 'Here it is, in white.', attachments: undefined },
                {
                    text: '',
                    attachments: [
                        { type: 'image', url: 'https://cdn/shirt.jpg' },
                    ],
                },
            ]);
            expect(adapter.sendMessage.mock.calls[1][2].content).toEqual({
                kind: 'media',
                url: 'https://cdn/shirt.jpg',
                mediaType: 'image',
            });
        }
    );
});

describe('StreamingDelivery — markdown in text', () => {
    it.each([
        ['buffered', undefined],
        ['incremental', GUARD_OFF],
    ])(
        '%s: sends markdown image syntax as plain text',
        async (_mode, chatbot) => {
            const adapter = makeAdapter();
            await new StreamingDelivery().deliver({
                adapter,
                account: {} as any,
                senderId: 'S',
                conversationId: 'C',
                chatbot,
                stream: sse([
                    line({
                        type: 'text-delta',
                        id: 't1',
                        delta: 'see ![x](https://evil/p.png)',
                    }),
                    line({ type: 'finish' }),
                    DONE,
                ]),
                abort: new AbortController(),
                isCurrent: async () => true,
                onSegmentPersist: async () => 'nonce',
                onSent: async () => {},
                onFailed: async () => {},
            });
            expect(
                adapter.sendMessage.mock.calls.map(c => c[2].content.kind)
            ).toEqual(['text']);
        }
    );
});

describe('StreamingDelivery — send_image file parts', () => {
    it.each([
        ['buffered', undefined],
        ['incremental', GUARD_OFF],
    ])(
        '%s: sends text, then the image, in stream order',
        async (_mode, chatbot) => {
            const adapter = makeAdapter();
            const persisted: { text: string; attachments?: unknown[] }[] = [];
            await new StreamingDelivery().deliver({
                adapter,
                account: {} as any,
                senderId: 'S',
                conversationId: 'C',
                chatbot,
                stream: sse([
                    line({ type: 'text-delta', id: 't1', delta: 'Mẫu này nè' }),
                    line({
                        type: 'tool-input-start',
                        toolCallId: 'r1',
                        toolName: 'send_image',
                    }),
                    line({
                        type: 'tool-output-available',
                        toolCallId: 'r1',
                        output: { ok: true, url: 'https://cdn/s.jpg' },
                    }),
                    line({
                        type: 'file',
                        url: 'https://cdn/s.jpg',
                        mediaType: 'image/*',
                    }),
                    line({ type: 'text-delta', id: 't2', delta: 'Giá 350k' }),
                    line({ type: 'finish' }),
                    DONE,
                ]),
                abort: new AbortController(),
                isCurrent: async () => true,
                onSegmentPersist: async (text, attachments) => {
                    persisted.push({ text, attachments });
                    return 'nonce';
                },
                onSent: async () => {},
                onFailed: async () => {},
            });
            expect(persisted).toEqual([
                { text: 'Mẫu này nè', attachments: undefined },
                {
                    text: '',
                    attachments: [{ type: 'image', url: 'https://cdn/s.jpg' }],
                },
                { text: 'Giá 350k', attachments: undefined },
            ]);
            expect(adapter.sendMessage.mock.calls[1][2].content.kind).toBe(
                'media'
            );
        }
    );
});

describe('guardrailDeliveryPolicy', () => {
    it('no chatbot -> buffered (safe default)', () => {
        expect(guardrailDeliveryPolicy()).toEqual({
            mode: 'buffered',
            heuristicPerPart: false,
        });
    });
    it('guardrails off -> incremental, no per-part check', () => {
        expect(guardrailDeliveryPolicy(GUARD_OFF)).toEqual({
            mode: 'incremental',
            heuristicPerPart: false,
        });
    });
    it('heuristic-only -> incremental + per-part heuristic', () => {
        expect(guardrailDeliveryPolicy(GUARD_HEURISTIC)).toEqual({
            mode: 'incremental',
            heuristicPerPart: true,
        });
    });
    it('model tier on -> buffered (semantic needs whole reply)', () => {
        expect(
            guardrailDeliveryPolicy({
                guardrailEnabled: true,
                guardrailModelEnabled: true,
            }).mode
        ).toBe('buffered');
    });
    it('custom instruction present -> buffered', () => {
        expect(
            guardrailDeliveryPolicy({
                guardrailEnabled: true,
                guardrailModelEnabled: false,
                guardrailCustomInstruction: 'block competitors',
            }).mode
        ).toBe('buffered');
    });
});

describe('outputHeuristic', () => {
    it('flags an OpenAI-style key', () => {
        expect(outputHeuristic('here is sk-proj-abc123XYZabc123XYZ')).toBe(
            'guardrail_output_heuristic'
        );
    });
    it('passes clean text', () => {
        expect(outputHeuristic('giá sản phẩm là 1.990.000 VND')).toBeNull();
    });
});

describe('StreamingDelivery.deliver (incremental)', () => {
    it('guardrails off: flushes each paragraph as its own message mid-stream', async () => {
        const adapter = makeAdapter();
        const sd = new StreamingDelivery();
        const persisted: string[] = [];
        const res = await sd.deliver({
            adapter,
            account: {} as any,
            senderId: 'S',
            conversationId: 'C',
            chatbot: GUARD_OFF,
            stream: sse([
                line({
                    type: 'text-delta',
                    id: 't1',
                    delta: 'para one\n\npara two',
                }),
                line({ type: 'finish' }),
                DONE,
            ]),
            abort: new AbortController(),
            isCurrent: async () => true,
            onSegmentPersist: async t => {
                persisted.push(t);
                return 'nonce';
            },
            onSent: async () => {},
            onFailed: async () => {},
        });
        expect(persisted).toEqual(['para one', 'para two']);
        expect(adapter.sendMessage).toHaveBeenCalledTimes(2);
        expect(res).toMatchObject({ anySent: true, superseded: false });
    });

    it('heuristic tier: sends the clean paragraph, blocks the one with a secret', async () => {
        const adapter = makeAdapter();
        const sd = new StreamingDelivery();
        const persisted: string[] = [];
        const res = await sd.deliver({
            adapter,
            account: {} as any,
            senderId: 'S',
            conversationId: 'C',
            chatbot: GUARD_HEURISTIC,
            stream: sse([
                line({ type: 'text-delta', id: 't1', delta: 'safe para' }),
                line({
                    type: 'text-delta',
                    id: 't1',
                    delta: '\n\nkey sk-proj-abc123XYZabc123XYZ',
                }),
                line({ type: 'finish' }),
                DONE,
            ]),
            abort: new AbortController(),
            isCurrent: async () => true,
            onSegmentPersist: async t => {
                persisted.push(t);
                return 'nonce';
            },
            onSent: async () => {},
            onFailed: async () => {},
        });
        expect(persisted).toEqual(['safe para']); // secret paragraph never sent
        expect(adapter.sendMessage).toHaveBeenCalledTimes(1);
        expect(res).toMatchObject({
            anySent: true,
            guardrailBlocked: true,
            guardrailReason: 'guardrail_output_heuristic',
        });
    });
});

describe('StreamingDelivery — token usage', () => {
    const usageLine = (usage: object) =>
        line({ type: 'message-metadata', messageMetadata: { usage } });

    const baseParams = (stream: any, chatbot: any) => ({
        adapter: makeAdapter(),
        account: {} as any,
        senderId: 'S',
        conversationId: 'C',
        chatbot,
        stream,
        abort: new AbortController(),
        isCurrent: async () => true,
        onSegmentPersist: async () => 'nonce',
        onSent: async () => {},
        onFailed: async () => {},
    });

    it('reports usage on the incremental path', async () => {
        const sd = new StreamingDelivery();
        const res = await sd.deliver(
            baseParams(
                sse([
                    line({ type: 'text-delta', id: 't1', delta: 'hi' }),
                    usageLine({
                        input_tokens: 12,
                        output_tokens: 8,
                        total_tokens: 20,
                    }),
                    line({ type: 'finish' }),
                    DONE,
                ]),
                GUARD_OFF
            ) as any
        );

        expect(res.usage).toEqual({
            inputTokens: 12,
            outputTokens: 8,
            totalTokens: 20,
        });
    });

    it('reports usage on the buffered path', async () => {
        const sd = new StreamingDelivery();
        const res = await sd.deliver(
            baseParams(
                sse([
                    line({ type: 'text-delta', id: 't1', delta: 'hi' }),
                    usageLine({
                        input_tokens: 3,
                        output_tokens: 4,
                        total_tokens: 7,
                    }),
                    line({ type: 'finish' }),
                    DONE,
                ]),
                {
                    guardrailEnabled: true,
                    guardrailModelEnabled: true,
                }
            ) as any
        );

        expect(res.usage).toEqual({
            inputTokens: 3,
            outputTokens: 4,
            totalTokens: 7,
        });
    });

    // The tokens were burned before the guardrail verdict arrived — the reply is
    // discarded but the bill is not.
    it('reports usage even when the reply is guardrail-blocked', async () => {
        const sd = new StreamingDelivery();
        const res = await sd.deliver(
            baseParams(
                sse([
                    line({ type: 'text-delta', id: 't1', delta: 'blocked' }),
                    usageLine({
                        input_tokens: 5,
                        output_tokens: 5,
                        total_tokens: 10,
                    }),
                    line({
                        type: 'data-guardrail',
                        data: { reason: 'policy' },
                    }),
                    line({ type: 'finish' }),
                    DONE,
                ]),
                {
                    guardrailEnabled: true,
                    guardrailModelEnabled: true,
                }
            ) as any
        );

        expect(res.guardrailBlocked).toBe(true);
        expect(res.usage?.totalTokens).toBe(10);
    });

    it('leaves usage undefined when apps/ai reports none', async () => {
        const sd = new StreamingDelivery();
        const res = await sd.deliver(
            baseParams(
                sse([
                    line({ type: 'text-delta', id: 't1', delta: 'hi' }),
                    line({ type: 'finish' }),
                    DONE,
                ]),
                GUARD_OFF
            ) as any
        );

        expect(res.usage).toBeUndefined();
    });
});

/**
 * #286: what the agent did for a channel reply (skills loaded, knowledge
 * searched) is read off the stream so the inbox can show it. Registry tool
 * calls are already persisted by the tool executor, and reasoning is never
 * kept, so neither becomes an activity.
 */
describe('StreamingDelivery — agent activity', () => {
    const params = (stream: any, chatbot: any) => ({
        adapter: makeAdapter(),
        account: {} as any,
        senderId: 'S',
        conversationId: 'C',
        chatbot,
        stream,
        abort: new AbortController(),
        isCurrent: async () => true,
        onSegmentPersist: async () => 'nonce',
        onSent: async () => {},
        onFailed: async () => {},
    });

    const activityStream = () =>
        sse([
            line({ type: 'start' }),
            line({ type: 'data-knowledge', data: { count: 2 } }),
            line({ type: 'reasoning-start', id: 'r' }),
            line({ type: 'reasoning-delta', id: 'r', delta: 'thinking' }),
            line({ type: 'reasoning-end', id: 'r' }),
            line({
                type: 'tool-input-start',
                toolCallId: 'call-1',
                toolName: 'load_skill',
            }),
            line({
                type: 'tool-input-available',
                toolCallId: 'call-1',
                toolName: 'load_skill',
                input: { slug: 'refunds' },
            }),
            line({
                type: 'data-tool-meta',
                id: 'call-1',
                data: { kind: 'skill' },
            }),
            line({
                type: 'tool-output-available',
                toolCallId: 'call-1',
                output: 'skill body',
            }),
            line({
                type: 'tool-input-start',
                toolCallId: 'call-2',
                toolName: 'get_order',
            }),
            line({
                type: 'tool-input-available',
                toolCallId: 'call-2',
                toolName: 'get_order',
                input: { id: 7 },
            }),
            line({
                type: 'data-tool-meta',
                id: 'call-2',
                data: { kind: 'mcp', label: 'Shopify' },
            }),
            line({
                type: 'text-delta',
                id: 't1',
                delta: 'Refunds take 5 days.',
            }),
            line({
                type: 'message-metadata',
                messageMetadata: {
                    sources: [
                        {
                            id: 'KB-1',
                            title: 'Refund policy',
                            source_url: 'https://shop.vn/refunds',
                        },
                        { id: 'KB-2', title: 'FAQ', source_url: null },
                    ],
                },
            }),
            line({ type: 'finish' }),
            DONE,
        ]);

    const expected = [
        {
            kind: ENUM_CONVERSATION_ACTIVITY_KIND.KNOWLEDGE,
            count: 2,
            sources: [
                {
                    id: 'KB-1',
                    title: 'Refund policy',
                    sourceUrl: 'https://shop.vn/refunds',
                },
                { id: 'KB-2', title: 'FAQ' },
            ],
            at: expect.any(Date),
        },
        {
            kind: ENUM_CONVERSATION_ACTIVITY_KIND.SKILL,
            label: 'refunds',
            at: expect.any(Date),
        },
    ];

    it('records skill loads and knowledge searches on the incremental path', async () => {
        const res = await new StreamingDelivery().deliver(
            params(activityStream(), GUARD_OFF) as any
        );

        expect(res.activities).toEqual(expected);
    });

    it('records them on the buffered path too', async () => {
        const res = await new StreamingDelivery().deliver(
            params(activityStream(), {
                guardrailEnabled: true,
                guardrailModelEnabled: true,
            }) as any
        );

        expect(res.activities).toEqual(expected);
    });

    it('records built-in tool calls, a handoff tag as a handoff', async () => {
        const res = await new StreamingDelivery().deliver(
            params(
                sse([
                    line({
                        type: 'tool-input-available',
                        toolCallId: 'call-1',
                        toolName: 'apply_customer_tag',
                        input: { name: 'Đã cọc' },
                    }),
                    line({
                        type: 'data-tool-meta',
                        id: 'call-1',
                        data: { kind: 'tag' },
                    }),
                    line({
                        type: 'tool-output-available',
                        toolCallId: 'call-1',
                        output: { ok: true, triggeredHandoff: true },
                    }),
                    line({
                        type: 'tool-input-available',
                        toolCallId: 'call-2',
                        toolName: 'set_customer_field',
                        input: { key: 'phone', value: 'x' },
                    }),
                    line({
                        type: 'data-tool-meta',
                        id: 'call-2',
                        data: { kind: 'customer' },
                    }),
                    line({
                        type: 'tool-output-available',
                        toolCallId: 'call-2',
                        output: { error: 'invalid phone' },
                    }),
                    line({
                        type: 'tool-input-available',
                        toolCallId: 'call-3',
                        toolName: 'cancel_followup',
                        input: { id: 'f-1' },
                    }),
                    line({
                        type: 'data-tool-meta',
                        id: 'call-3',
                        data: { kind: 'followup' },
                    }),
                    line({
                        type: 'tool-output-available',
                        toolCallId: 'call-3',
                        output: { ok: false },
                    }),
                    // The sent image is its own record, as in the live chat.
                    line({
                        type: 'tool-input-available',
                        toolCallId: 'call-4',
                        toolName: 'send_image',
                        input: { url: 'https://cdn/a.jpg' },
                    }),
                    line({
                        type: 'data-tool-meta',
                        id: 'call-4',
                        data: { kind: 'image' },
                    }),
                    line({ type: 'text-delta', id: 't1', delta: 'ok' }),
                    line({ type: 'finish' }),
                    DONE,
                ]),
                GUARD_OFF
            ) as any
        );

        expect(res.activities).toEqual([
            {
                kind: ENUM_CONVERSATION_ACTIVITY_KIND.TOOL,
                label: 'apply_customer_tag',
                tool: {
                    kind: 'handoff',
                    args: { name: 'Đã cọc' },
                    result: { ok: true, triggeredHandoff: true },
                },
                at: expect.any(Date),
            },
            {
                kind: ENUM_CONVERSATION_ACTIVITY_KIND.TOOL,
                label: 'set_customer_field',
                tool: {
                    kind: 'customer',
                    args: { key: 'phone', value: 'x' },
                    error: 'invalid phone',
                },
                at: expect.any(Date),
            },
            {
                kind: ENUM_CONVERSATION_ACTIVITY_KIND.TOOL,
                label: 'cancel_followup',
                tool: {
                    kind: 'followup',
                    args: { id: 'f-1' },
                    error: 'failed',
                },
                at: expect.any(Date),
            },
        ]);
    });

    it('records nothing for a text-only reply', async () => {
        const res = await new StreamingDelivery().deliver(
            params(
                sse([
                    line({ type: 'text-delta', id: 't1', delta: 'hi' }),
                    line({ type: 'finish' }),
                    DONE,
                ]),
                GUARD_OFF
            ) as any
        );

        expect(res.activities).toEqual([]);
    });
});
