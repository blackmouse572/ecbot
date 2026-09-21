// apps/api/test/modules/chatbot/assistant-transcript.collector.spec.ts
import { AssistantTranscriptCollector } from '../../../src/modules/chatbot/utils/assistant-transcript.collector';

describe('AssistantTranscriptCollector', () => {
    it('concatenates text-delta frames in order', () => {
        const c = new AssistantTranscriptCollector();
        c.onFrame({ type: 'start', messageId: 'm1' });
        c.onFrame({ type: 'text-start', id: 't1' });
        c.onFrame({ type: 'text-delta', id: 't1', delta: 'Xin ' });
        c.onFrame({ type: 'text-delta', id: 't1', delta: 'chao' });
        c.onFrame({ type: 'text-end', id: 't1' });
        c.onFrame({ type: 'finish' });

        expect(c.assistantText()).toBe('Xin chao');
    });

    it('excludes reasoning deltas from the assistant text', () => {
        const c = new AssistantTranscriptCollector();
        c.onFrame({ type: 'reasoning-delta', id: 'r1', delta: 'thinking...' });
        c.onFrame({ type: 'text-delta', id: 't1', delta: 'answer' });

        expect(c.assistantText()).toBe('answer');
    });

    // apps/ai runs the output guardrail AFTER the text has streamed
    // (stream_pipeline.py), so blocked content reaches the wire. It must never
    // be persisted, or the next turn re-feeds it to the model as context.
    it('discards all text when a guardrail frame arrives after the text', () => {
        const c = new AssistantTranscriptCollector();
        c.onFrame({ type: 'text-delta', id: 't1', delta: 'blocked content' });
        c.onFrame({ type: 'data-guardrail', data: { reason: 'policy' } });

        expect(c.blocked).toBe(true);
        expect(c.shouldPersist()).toBe(false);
    });

    it('discards all text when an error frame arrives after the text', () => {
        const c = new AssistantTranscriptCollector();
        c.onFrame({ type: 'text-delta', id: 't1', delta: 'partial' });
        c.onFrame({ type: 'error', errorText: '' });

        expect(c.errored).toBe(true);
        expect(c.shouldPersist()).toBe(false);
    });

    it('does not persist an empty or whitespace-only reply', () => {
        const c = new AssistantTranscriptCollector();
        expect(c.shouldPersist()).toBe(false);

        c.onFrame({ type: 'text-delta', id: 't1', delta: '   \n ' });
        expect(c.shouldPersist()).toBe(false);
    });

    it('persists a clean reply', () => {
        const c = new AssistantTranscriptCollector();
        c.onFrame({ type: 'text-delta', id: 't1', delta: 'ok' });

        expect(c.shouldPersist()).toBe(true);
        expect(c.assistantText()).toBe('ok');
    });

    it('ignores frames without a usable delta', () => {
        const c = new AssistantTranscriptCollector();
        c.onFrame({ type: 'text-delta', id: 't1' });
        c.onFrame({
            type: 'text-delta',
            id: 't1',
            delta: 42 as unknown as string,
        });
        c.onFrame({ type: 'text-delta', id: 't1', delta: 'real' });

        expect(c.assistantText()).toBe('real');
    });
});

describe('AssistantTranscriptCollector — token usage', () => {
    const usageFrame = (usage: object) => ({
        type: 'message-metadata',
        messageMetadata: { usage },
    });

    it('captures usage from the message-metadata frame', () => {
        const c = new AssistantTranscriptCollector();
        c.onFrame({ type: 'text-delta', id: 't1', delta: 'hi' });
        c.onFrame(
            usageFrame({ input_tokens: 10, output_tokens: 4, total_tokens: 14 })
        );

        expect(c.usage).toEqual({
            inputTokens: 10,
            outputTokens: 4,
            totalTokens: 14,
        });
    });

    // The tokens were burned whether or not the reply is safe to keep, so usage
    // survives a guardrail block — only the text is discarded.
    it('keeps usage even when the reply is blocked', () => {
        const c = new AssistantTranscriptCollector();
        c.onFrame({ type: 'text-delta', id: 't1', delta: 'blocked' });
        c.onFrame(
            usageFrame({ input_tokens: 7, output_tokens: 3, total_tokens: 10 })
        );
        c.onFrame({ type: 'data-guardrail', data: { reason: 'policy' } });

        expect(c.shouldPersist()).toBe(false);
        expect(c.usage?.totalTokens).toBe(10);
    });

    it('leaves usage undefined when no message-metadata arrives', () => {
        const c = new AssistantTranscriptCollector();
        c.onFrame({ type: 'text-delta', id: 't1', delta: 'hi' });

        expect(c.usage).toBeUndefined();
    });

    // A negative count would survive into the ledger — `record` persists the
    // row before `applyUsage` rejects non-positive totals — and then subtract
    // from every SUM behind the caps and the breakdowns.
    it('ignores a negative usage payload', () => {
        const c = new AssistantTranscriptCollector();
        c.onFrame(
            usageFrame({
                input_tokens: -5,
                output_tokens: 0,
                total_tokens: 0,
            })
        );

        expect(c.usage).toBeUndefined();
    });

    it('ignores an all-zero usage payload', () => {
        const c = new AssistantTranscriptCollector();
        c.onFrame(
            usageFrame({ input_tokens: 0, output_tokens: 0, total_tokens: 0 })
        );

        expect(c.usage).toBeUndefined();
    });

    it('derives the total when the provider reports only input/output', () => {
        const c = new AssistantTranscriptCollector();
        c.onFrame(usageFrame({ input_tokens: 5, output_tokens: 6 }));

        expect(c.usage?.totalTokens).toBe(11);
    });
});

describe('parseWireTokenUsage — hostile payloads', () => {
    const usageFrame = (usage: object) => ({
        type: 'message-metadata',
        messageMetadata: { usage },
    });

    // A negative row is worse than a missing one: `record` persists before
    // `applyUsage`'s `<= 0` early-return, so it survives and drags down every
    // SUM the dashboards and the budget-cap guard read.
    it('rejects a payload with a negative count', () => {
        const c = new AssistantTranscriptCollector();
        c.onFrame(
            usageFrame({ input_tokens: -5, output_tokens: 0, total_tokens: 0 })
        );

        expect(c.usage).toBeUndefined();
    });

    it('rejects a negative derived total', () => {
        const c = new AssistantTranscriptCollector();
        c.onFrame(usageFrame({ input_tokens: -10, output_tokens: 2 }));

        expect(c.usage).toBeUndefined();
    });

    it('rejects a non-numeric count instead of coercing it', () => {
        const c = new AssistantTranscriptCollector();
        c.onFrame(
            usageFrame({
                input_tokens: 'lots',
                output_tokens: 1,
                total_tokens: 1,
            })
        );

        expect(c.usage).toBeUndefined();
    });

    it('still accepts a turn where only one side is zero', () => {
        const c = new AssistantTranscriptCollector();
        c.onFrame(
            usageFrame({ input_tokens: 12, output_tokens: 0, total_tokens: 12 })
        );

        expect(c.usage).toEqual({
            inputTokens: 12,
            outputTokens: 0,
            totalTokens: 12,
        });
    });
});
