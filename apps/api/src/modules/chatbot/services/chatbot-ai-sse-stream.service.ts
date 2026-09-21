import { Injectable, Logger } from '@nestjs/common';
import { Response as ExpressResponse } from 'express';
import { IncomingMessage } from 'http';
import { pipeline } from 'stream';
import { AssistantTranscriptCollector } from '../utils/assistant-transcript.collector';
import { SafeErrorStream } from '../utils/safe-error-stream.transform';
import { TokenUsageDelta } from 'src/modules/chatbot/interfaces/token-usage-wire.interface';

export interface ISseStreamParams {
    res: ExpressResponse;
    /** An already-open apps/ai response stream. */
    upstream: IncomingMessage;
    /** Aborted when the client disconnects, so apps/ai stops generating. */
    abort: AbortController;
    /** Identifies the caller in error logs. */
    logContext: string;
    /**
     * Called once the stream ends, on success and failure alike, with whatever
     * assistant text was collected. Skipped when there is nothing worth keeping.
     */
    onFinalize: (assistantText: string) => Promise<void>;
    /**
     * Called once the stream ends with the token counts apps/ai reported, if
     * any. Separate from `onFinalize` because the conditions differ: a blocked
     * or failed reply is never persisted but its tokens were still burned.
     */
    onUsage?: (usage: TokenUsageDelta) => Promise<void>;
}

/**
 * Pumps an apps/ai reply stream into an HTTP response as SSE.
 *
 * Owns only transport: headers, error sanitizing, transcript capture, abort on
 * disconnect. Where the history came from and where the turn gets written are
 * the caller's business — the preview keeps both in ephemeral Redis, the
 * website widget keeps both in Postgres. Splitting those apart is what lets the
 * two share this without sharing a persistence model.
 */
@Injectable()
export class ChatbotAiSseStreamService {
    private readonly logger = new Logger(ChatbotAiSseStreamService.name);

    async pipe(params: ISseStreamParams): Promise<void> {
        const { res, upstream, abort, logContext, onFinalize, onUsage } =
            params;

        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        res.setHeader('x-vercel-ai-ui-message-stream', 'v1');
        res.flushHeaders();

        const collector = new AssistantTranscriptCollector();
        const sanitizer = new SafeErrorStream({
            logRawError: (rawErrorText: string) =>
                this.logger.error(
                    `Chat stream error for ${logContext}: ${rawErrorText}`
                ),
            onFrame: frame => collector.onFrame(frame),
        });

        let finalized = false;
        const finalize = async (): Promise<void> => {
            if (finalized) return;
            finalized = true;

            // Metering first and in its own try: a broken ledger must not cost
            // us the reply, and a failed reply must not cost us the meter.
            if (onUsage && collector.usage) {
                try {
                    await onUsage(collector.usage);
                } catch (error) {
                    this.logger.error(
                        `Failed to record token usage for ${logContext}: ${error}`
                    );
                }
            }

            if (!collector.shouldPersist()) return;
            try {
                await onFinalize(collector.assistantText());
            } catch (error) {
                this.logger.error(
                    `Failed to persist turn for ${logContext}: ${error}`
                );
            }
        };

        // Aborting on client disconnect is what stops apps/ai generating into
        // a closed socket — it polls `request.is_disconnected()` and gives up
        // as soon as the connection drops.
        const onClose = (): void => {
            if (!res.writableFinished) abort.abort();
        };
        res.on('close', onClose);

        await new Promise<void>(resolve => {
            // `pipeline` (not chained `.pipe()`) so a failure anywhere destroys
            // every stream and lands in one terminal callback — a bare pipe
            // leaks the upstream when the response dies first.
            pipeline(upstream, sanitizer, res, () => resolve());
        });

        res.off('close', onClose);
        // Runs on success and on failure alike. `_flush` is not a safe place
        // for this: it never runs when the client disconnects mid-stream.
        await finalize();
    }
}
