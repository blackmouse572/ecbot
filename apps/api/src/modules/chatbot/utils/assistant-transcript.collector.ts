// apps/api/src/modules/chatbot/utils/assistant-transcript.collector.ts
import {
    parseWireTokenUsage,
    TokenUsageDelta,
} from 'src/modules/chatbot/interfaces/token-usage-wire.interface';

/** One parsed AI SDK v5 UI-message-stream `data:` frame. */
export type UiStreamFrame = Record<string, unknown> & { type?: unknown };

/**
 * Accumulates the assistant's reply out of a UI message stream so it can be
 * persisted as preview history. Deliberately holds no stream state — it is fed
 * frame by frame by `SafeErrorStream`'s `onFrame` observer, which already owns
 * the line buffering and JSON parsing.
 */
export class AssistantTranscriptCollector {
    private text = '';
    private imageUrls: string[] = [];
    /** A guardrail tripped. apps/ai emits `data-guardrail` *after* the text has
     * already streamed, so blocked content reaches the wire — it must never be
     * written to history, or the next turn feeds it back to the model. */
    blocked = false;
    /** The generation failed; whatever text arrived is a partial reply. */
    errored = false;
    /** Token counts apps/ai reported for this turn. Survives `blocked`/`errored`
     * on purpose — the tokens were burned before the verdict arrived, so the
     * reply is discarded but the bill is not. */
    usage?: TokenUsageDelta;

    onFrame(frame: UiStreamFrame): void {
        const type = frame.type;
        if (type === 'text-delta') {
            const delta = frame.delta;
            if (typeof delta === 'string') this.text += delta;
            return;
        }
        // An image the reply sent (send_image, or an allowed markdown image).
        if (
            type === 'file' &&
            typeof frame.url === 'string' &&
            typeof frame.mediaType === 'string' &&
            frame.mediaType.startsWith('image/')
        ) {
            this.imageUrls.push(frame.url);
            return;
        }
        if (type === 'message-metadata') {
            const metadata = frame.messageMetadata as
                { usage?: unknown } | undefined;
            const usage = parseWireTokenUsage(metadata?.usage);
            if (usage) this.usage = usage;
            return;
        }
        if (type === 'data-guardrail') this.blocked = true;
        else if (type === 'error') this.errored = true;
    }

    assistantText(): string {
        return this.text;
    }

    /** URLs of the images the reply sent, in order. */
    images(): string[] {
        return this.imageUrls;
    }

    /** Whether this turn is safe and meaningful to persist. */
    shouldPersist(): boolean {
        return (
            !this.blocked &&
            !this.errored &&
            (this.text.trim().length > 0 || this.imageUrls.length > 0)
        );
    }
}
