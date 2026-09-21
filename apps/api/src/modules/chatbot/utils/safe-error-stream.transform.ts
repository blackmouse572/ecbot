// apps/api/src/modules/chatbot/utils/safe-error-stream.transform.ts
import { Transform } from 'stream';
import { StringDecoder } from 'string_decoder';
import { UiStreamFrame } from './assistant-transcript.collector';
import { safeErrorText } from './chat-stream-error.util';

export type SafeErrorStreamOptions = {
    /**
     * Receives the raw (unsanitized) error text so it can be logged server-side
     * before the client-facing copy is rewritten.
     */
    logRawError: (rawErrorText: string) => void;
    /**
     * Observes every parsed frame as it passes through, before any rewriting.
     * This transform already decodes, line-buffers and JSON-parses each `data:`
     * line, so observers ride along instead of duplicating that work in a
     * second stream. Never alters the output; a throwing observer is swallowed
     * so an observability concern can't break the stream.
     */
    onFrame?: (frame: UiStreamFrame) => void;
};

/**
 * SSE pass-through that rewrites AI SDK v5 `error` frames. The full provider
 * error is logged via `logRawError`, then `errorText` is replaced with a safe
 * whitelisted message (or emptied) so internal details never reach the client.
 * All other frames are forwarded byte-for-byte.
 */
export class SafeErrorStream extends Transform {
    private readonly decoder = new StringDecoder('utf8');
    private lineBuffer = '';
    private readonly logRawError: (rawErrorText: string) => void;
    private readonly onFrame?: (frame: UiStreamFrame) => void;

    constructor(options: SafeErrorStreamOptions) {
        super();
        this.logRawError = options.logRawError;
        this.onFrame = options.onFrame;
    }

    override _transform(
        chunk: Buffer,
        _encoding: BufferEncoding,
        callback: (error?: Error | null) => void
    ): void {
        this.lineBuffer += this.decoder.write(chunk);
        const lines = this.lineBuffer.split('\n');
        this.lineBuffer = lines.pop() ?? '';
        for (const line of lines) this.consumeLine(`${line}\n`);
        callback();
    }

    override _flush(callback: (error?: Error | null) => void): void {
        this.lineBuffer += this.decoder.end();
        if (this.lineBuffer) this.consumeLine(this.lineBuffer);
        this.lineBuffer = '';
        callback();
    }

    private consumeLine(line: string): void {
        if (!line.startsWith('data: ')) {
            this.push(line);
            return;
        }
        const body = line.slice('data: '.length).replace(/\n$/, '');
        if (body === '[DONE]') {
            this.push(line);
            return;
        }
        let parsed: { type?: string; errorText?: unknown };
        try {
            parsed = JSON.parse(body) as { type?: string; errorText?: unknown };
        } catch {
            this.push(line);
            return;
        }
        this.observe(parsed);
        if (!parsed || typeof parsed !== 'object' || parsed.type !== 'error') {
            this.push(line);
            return;
        }
        const raw =
            typeof parsed.errorText === 'string' ? parsed.errorText : '';
        this.logRawError(raw);
        parsed.errorText = safeErrorText(raw);
        this.push(`data: ${JSON.stringify(parsed)}\n`);
    }

    private observe(frame: unknown): void {
        if (!this.onFrame || !frame || typeof frame !== 'object') return;
        try {
            this.onFrame(frame as UiStreamFrame);
        } catch {
            // An observer must never break the stream it is watching.
        }
    }
}
