import { Injectable, Logger } from '@nestjs/common';
import { IncomingMessage } from 'http';
import { StringDecoder } from 'string_decoder';
import { PlatformAdapter } from '../adapters/platform-adapter.base';
import { AccountEntity } from '@app/modules/account/repository/entities/account.entity';
import { ReplySegment, segmentMessages } from '../interfaces/message-model';
import { ReplySegmenter } from '../utils/reply-segmenter';
import {
    parseWireTokenUsage,
    TokenUsageDelta,
} from 'src/modules/chatbot/interfaces/token-usage-wire.interface';

/** The chatbot guardrail knobs the delivery policy reads (structural — any
 *  object with these fields works, e.g. ChatbotEntity). */
export interface GuardrailConfig {
    guardrailEnabled: boolean;
    guardrailModelEnabled: boolean;
    guardrailCustomInstruction?: string | null;
}

export interface StreamingDeliverParams {
    adapter: PlatformAdapter;
    account: AccountEntity;
    senderId: string;
    conversationId: string;
    stream: IncomingMessage;
    abort: AbortController;
    isCurrent: () => Promise<boolean>;
    /** Persist one outbound message, return the clientNonce. */
    onSegmentPersist: (
        segmentText: string,
        attachments?: unknown[]
    ) => Promise<string>;
    onSent: (nonce: string, externalId: string) => Promise<void>;
    onFailed: (nonce: string) => Promise<void>;
    /** apps/ai described the user's images; keep it for later turns. */
    onImageDescription?: (
        messageId: string,
        description: string
    ) => Promise<void>;
    /** Guardrail config that selects buffered vs incremental delivery. When
     *  absent, delivery stays buffered (the safe default). */
    chatbot?: GuardrailConfig;
}

/**
 * Delivery mode per chatbot. A *semantic* output guardrail (LLM model/custom
 * tier) runs on the whole reply and its verdict only arrives at stream end, so
 * it forces buffered (drain-then-send). Otherwise we can stream segments as
 * they flush; when the heuristic tier is on we screen each part first.
 */
export function guardrailDeliveryPolicy(cb?: GuardrailConfig): {
    mode: 'buffered' | 'incremental';
    heuristicPerPart: boolean;
} {
    if (!cb) return { mode: 'buffered', heuristicPerPart: false };
    const semanticInPlay =
        cb.guardrailEnabled &&
        (cb.guardrailModelEnabled || !!cb.guardrailCustomInstruction?.trim());
    if (semanticInPlay) return { mode: 'buffered', heuristicPerPart: false };
    return { mode: 'incremental', heuristicPerPart: cb.guardrailEnabled };
}

// Output-leak patterns — KEEP IN SYNC with apps/ai
// `llm/guardrails/content.py::_SECRET_PATTERNS`. Only the cheap heuristic tier
// is portable per-part; the semantic tiers force buffered (see policy above).
const OUTPUT_SECRET_PATTERNS: RegExp[] = [
    /sk-[a-zA-Z0-9\-_]{20,}/, // OpenAI-style keys
    /AKIA[0-9A-Z]{16}/, // AWS access key id
    /eyJ[a-zA-Z0-9_\-]+\.eyJ[a-zA-Z0-9_\-]+\.[a-zA-Z0-9_\-]+/, // JWT
    /Bearer\s+[a-zA-Z0-9\-_.]{40,}/i, // bearer token
    /\b\d{4}[- ]?\d{4}[- ]?\d{4}[- ]?\d{4}\b/, // 16-digit card
    /\b\d{13,15}\b/, // Amex/other card lengths
    /\b\d{3}-\d{2}-\d{4}\b/, // US SSN
    /ghp_[a-zA-Z0-9]{36}/, // GitHub PAT
    /AIza[0-9A-Za-z\-_]{35}/, // Google API key
];

/** Return a reason if the (cumulative) text trips an output-secret pattern. */
export function outputHeuristic(text: string): string | null {
    for (const re of OUTPUT_SECRET_PATTERNS) {
        if (re.test(text)) return 'guardrail_output_heuristic';
    }
    return null;
}

/** Parse one SSE line into its UI-message part, or null. Shared by both
 *  delivery paths so the frame contract lives in one place. */
function parseSsePart(line: string): {
    type: string;
    delta?: unknown;
    data?: unknown;
    messageMetadata?: unknown;
    url?: unknown;
    mediaType?: unknown;
} | null {
    if (!line.startsWith('data: ')) return null;
    const body = line.slice(6);
    if (body === '[DONE]') return null;
    try {
        const parsed = JSON.parse(body);
        return parsed && typeof parsed === 'object' ? parsed : null;
    } catch {
        return null;
    }
}

/** The `data-image-description` payload, or null if malformed. */
function imageDescription(
    data: unknown
): { messageId: string; description: string } | null {
    const { messageId, description } = (data ?? {}) as {
        messageId?: unknown;
        description?: unknown;
    };
    return typeof messageId === 'string' && typeof description === 'string'
        ? { messageId, description }
        : null;
}

/** A `file` part carrying an image (emitted by apps/ai for `send_image`). */
function isImagePart(part: {
    type: string;
    url?: unknown;
    mediaType?: unknown;
}): part is { type: 'file'; url: string; mediaType: string } {
    return (
        part.type === 'file' &&
        typeof part.url === 'string' &&
        typeof part.mediaType === 'string' &&
        part.mediaType.startsWith('image/')
    );
}

export interface DeliveryResult {
    anySent: boolean;
    superseded: boolean;
    guardrailBlocked: boolean;
    guardrailReason: string;
    generationFailed: boolean;
    /** Token counts apps/ai reported for this turn, when it reported any.
     *  Present even on a blocked or failed turn — the tokens were already
     *  burned by the time the verdict arrived. */
    usage?: TokenUsageDelta;
}

@Injectable()
export class StreamingDelivery {
    private readonly logger = new Logger(StreamingDelivery.name);

    /**
     * Deliver an AI reply stream to the platform. Buffered when a semantic
     * output guardrail is in play (its verdict needs the whole reply);
     * incremental otherwise — segments ship as they flush so the first
     * paragraph reaches the customer while the model is still generating.
     */
    async deliver(p: StreamingDeliverParams): Promise<DeliveryResult> {
        const policy = guardrailDeliveryPolicy(p.chatbot);
        return policy.mode === 'incremental'
            ? this.deliverIncremental(p, policy.heuristicPerPart)
            : this.deliverBuffered(p);
    }

    /**
     * Send segments as they flush (paragraph or tool boundary) during the
     * stream. When `heuristicPerPart`, screen the cumulative text with the
     * output-secret heuristic before each send. No whole-reply semantic
     * guardrail here — the policy only routes here when none is configured.
     */
    private deliverIncremental(
        p: StreamingDeliverParams,
        heuristicPerPart: boolean
    ): Promise<DeliveryResult> {
        return new Promise(resolve => {
            const decoder = new StringDecoder('utf8');
            let lineBuffer = '';
            let cumulative = ''; // all text queued so far (for the heuristic)
            let anySent = false;
            let superseded = false;
            let blocked = false;
            let blockReason = '';
            let failed = false;
            let settled = false;
            let usage: TokenUsageDelta | undefined;
            // Serial send chain: sends run in order, off the stream's data
            // handler, so we never block the socket (mirrors the buffered
            // supersede-check pattern).
            let sendChain: Promise<void> = Promise.resolve();
            let lastCheck = 0;
            let checking = false;
            let pendingCheck: Promise<void> | null = null;

            const enqueueSend = (seg: ReplySegment) => {
                sendChain = sendChain.then(async () => {
                    if (blocked || superseded || failed) return;
                    if (heuristicPerPart && seg.text) {
                        cumulative += (cumulative ? '\n' : '') + seg.text;
                        const hit = outputHeuristic(cumulative);
                        if (hit) {
                            blocked = true;
                            blockReason = hit;
                            p.abort.abort();
                            return;
                        }
                    }
                    if (!(await p.isCurrent())) {
                        superseded = true;
                        p.abort.abort();
                        return;
                    }
                    if (await this.sendSegment(p, seg)) anySent = true;
                });
            };
            const segments = new ReplySegmenter(enqueueSend, true);

            const consumeLine = (line: string) => {
                const parsed = parseSsePart(line);
                if (!parsed) return;
                if (
                    parsed.type === 'text-delta' &&
                    typeof parsed.delta === 'string'
                ) {
                    segments.addText(parsed.delta);
                } else if (parsed.type === 'tool-input-start') {
                    segments.close();
                } else if (parsed.type === 'data-image-description') {
                    this.keepDescription(p, parsed.data);
                } else if (isImagePart(parsed)) {
                    segments.addImage(parsed.url);
                } else if (parsed.type === 'data-guardrail') {
                    // Defensive: shouldn't fire in incremental mode (no semantic
                    // tier). If it does, stop sending the rest.
                    blocked = true;
                    blockReason =
                        (parsed.data as { reason: string })?.reason ?? '';
                    p.abort.abort();
                } else if (parsed.type === 'error') {
                    failed = true;
                    p.abort.abort();
                } else if (parsed.type === 'message-metadata') {
                    const parsedUsage = parseWireTokenUsage(
                        (parsed.messageMetadata as { usage?: unknown })?.usage
                    );
                    if (parsedUsage) usage = parsedUsage;
                }
            };

            const finish = (sup: boolean) => {
                if (settled) return;
                settled = true;
                lineBuffer += decoder.end();
                if (lineBuffer) consumeLine(lineBuffer);
                if (!blocked && !failed && !sup) segments.close();
                // Resolve only after the send chain drains, so callers see the
                // final anySent/blocked/superseded state.
                sendChain.finally(() =>
                    resolve({
                        anySent,
                        superseded: superseded || sup,
                        guardrailBlocked: blocked,
                        guardrailReason: blockReason,
                        generationFailed: failed,
                        usage,
                    })
                );
            };

            p.stream.on('data', (chunk: Buffer) => {
                lineBuffer += decoder.write(chunk);
                const lines = lineBuffer.split('\n');
                lineBuffer = lines.pop() ?? '';
                for (const line of lines) consumeLine(line);

                const now = Date.now();
                if (!checking && !settled && now - lastCheck > 500) {
                    checking = true;
                    lastCheck = now;
                    pendingCheck = p
                        .isCurrent()
                        .then(cur => {
                            if (!cur) {
                                superseded = true;
                                p.abort.abort();
                                finish(true);
                            }
                        })
                        .finally(() => {
                            checking = false;
                            pendingCheck = null;
                        });
                }
            });
            p.stream.on('end', async () => {
                if (pendingCheck) await pendingCheck;
                finish(superseded);
            });
            p.stream.on('error', (err: Error) => {
                if (p.abort.signal.aborted || superseded || blocked) {
                    finish(true);
                } else {
                    this.logger.warn(`stream error: ${err.message}`);
                    failed = true;
                    finish(false);
                }
            });
        });
    }

    /**
     * Drain-then-send: collect every segment, honor the end-of-stream
     * guardrail / error / supersede verdict, then send in order.
     */
    private async deliverBuffered(
        p: StreamingDeliverParams
    ): Promise<DeliveryResult> {
        const result = await this.consumeStream(
            p.stream,
            p.abort,
            p.isCurrent,
            data => this.keepDescription(p, data)
        );

        if (result.superseded) {
            return {
                anySent: false,
                superseded: true,
                guardrailBlocked: false,
                guardrailReason: '',
                generationFailed: false,
                usage: result.usage,
            };
        }
        if (result.guardrailBlocked) {
            return {
                anySent: false,
                superseded: false,
                guardrailBlocked: true,
                guardrailReason: result.guardrailReason,
                generationFailed: false,
                usage: result.usage,
            };
        }
        if (result.generationFailed) {
            return {
                anySent: false,
                superseded: false,
                guardrailBlocked: false,
                guardrailReason: '',
                generationFailed: true,
                usage: result.usage,
            };
        }

        let anySent = false;
        let supersededMidSend = false;
        for (const segment of result.segments) {
            if (!(await p.isCurrent())) {
                supersededMidSend = true;
                break;
            }
            if (await this.sendSegment(p, segment)) anySent = true;
        }
        return {
            anySent,
            superseded: supersededMidSend,
            guardrailBlocked: false,
            guardrailReason: '',
            generationFailed: false,
            usage: result.usage,
        };
    }

    /** Hand a described-images part to the caller; never fails the reply. */
    private keepDescription(p: StreamingDeliverParams, data: unknown): void {
        const parsed = imageDescription(data);
        const save = p.onImageDescription;
        if (!parsed || !save) return;
        Promise.resolve()
            .then(() => save(parsed.messageId, parsed.description))
            .catch(err =>
                this.logger.warn(
                    `Saving image description failed: ${(err as Error).message}`
                )
            );
    }

    /**
     * Persist and send one reply segment: its text, then each image, each as
     * its own platform message. Returns whether anything reached the customer.
     */
    private async sendSegment(
        p: StreamingDeliverParams,
        segment: ReplySegment
    ): Promise<boolean> {
        let sent = false;
        for (const msg of segmentMessages(segment)) {
            const nonce =
                msg.content.kind === 'media'
                    ? await p.onSegmentPersist('', [
                          { type: 'image', url: msg.content.url },
                      ])
                    : await p.onSegmentPersist(msg.fallbackText);
            try {
                const { externalId } = await p.adapter.sendMessage(
                    p.account,
                    p.senderId,
                    msg
                );
                await p.onSent(nonce, externalId);
                sent = true;
            } catch {
                await p.onFailed(nonce);
            }
        }
        return sent;
    }

    /**
     * Drain the SSE (AI SDK v5 UI Message Stream) into ordered reply segments.
     * The agent emits a distinct run of `text-delta` parts before and after
     * each tool roundtrip; a `tool-input-start` part closes the current
     * segment so the text on either side of a tool call becomes a separate
     * outbound message instead of one run-on reply. Between chunks (throttled)
     * it checks whether this generation is still current; if a newer message
     * superseded it, the stream is aborted (which closes the HTTP connection
     * so apps/ai stops generating — Phase 2) and we resolve `superseded: true`.
     */
    private consumeStream(
        stream: IncomingMessage,
        ac: AbortController,
        isCurrent: () => Promise<boolean>,
        onImageDescription: (data: unknown) => void
    ): Promise<{
        segments: ReplySegment[];
        superseded: boolean;
        guardrailBlocked: boolean;
        guardrailReason: string;
        generationFailed: boolean;
        usage?: TokenUsageDelta;
    }> {
        return new Promise(resolve => {
            const segments: ReplySegment[] = [];
            // No paragraph split: the guardrail's verdict covers the whole
            // reply, so text between tool calls is one message.
            const segmenter = new ReplySegmenter(
                segment => segments.push(segment),
                false
            );
            let superseded = false;
            let guardrailBlocked = false;
            let guardrailReason = '';
            let generationFailed = false;
            let usage: TokenUsageDelta | undefined;
            let settled = false;
            let lastCheck = 0; // 0 so the throttled supersede check fires on the first chunk
            let checking = false;
            let pendingCheck: Promise<void> | null = null;

            // Chunks are arbitrary byte buffers: an SSE line — or even a single
            // multi-byte UTF-8 char (e.g. Vietnamese) — can straddle a chunk
            // boundary. StringDecoder holds back incomplete multi-byte
            // sequences; `lineBuffer` holds back the trailing partial line until
            // its newline arrives in a later chunk.
            const decoder = new StringDecoder('utf8');
            let lineBuffer = '';

            const consumeLine = (line: string) => {
                if (!line.startsWith('data: ')) return;
                const body = line.slice(6);
                if (body === '[DONE]') return; // end-of-stream sentinel — not JSON
                let parsed: {
                    type: string;
                    delta?: unknown;
                    data?: unknown;
                    messageMetadata?: unknown;
                    url?: unknown;
                    mediaType?: unknown;
                };
                try {
                    parsed = JSON.parse(body) as typeof parsed;
                } catch {
                    return; // non-JSON line — ignore
                }
                if (!parsed || typeof parsed !== 'object') return;
                if (
                    parsed.type === 'text-delta' &&
                    typeof parsed.delta === 'string'
                ) {
                    segmenter.addText(parsed.delta);
                } else if (parsed.type === 'tool-input-start') {
                    segmenter.close(); // a tool call ends the spoken segment
                } else if (parsed.type === 'data-image-description') {
                    onImageDescription(parsed.data);
                } else if (isImagePart(parsed)) {
                    segmenter.addImage(parsed.url);
                } else if (parsed.type === 'data-guardrail') {
                    guardrailBlocked = true;
                    guardrailReason =
                        (parsed.data as { reason: string })?.reason ?? '';
                    segments.length = 0; // discard any accumulated text
                    segmenter.reset();
                } else if (parsed.type === 'error') {
                    generationFailed = true;
                    segments.length = 0;
                    segmenter.reset();
                } else if (parsed.type === 'message-metadata') {
                    const parsedUsage = parseWireTokenUsage(
                        (parsed.messageMetadata as { usage?: unknown })?.usage
                    );
                    if (parsedUsage) usage = parsedUsage;
                }
                // All other part types (start, text-start, text-end,
                // tool-input-available, tool-output-available, reasoning-*,
                // source-*, message-metadata, finish, error) are ignored for
                // delivery.
            };

            const finish = (sup: boolean) => {
                if (settled) return;
                settled = true;
                // Flush any decoder/line remainder, then the final segment.
                lineBuffer += decoder.end();
                if (lineBuffer) consumeLine(lineBuffer);
                if (!guardrailBlocked && !generationFailed) segmenter.close();
                resolve({
                    segments:
                        guardrailBlocked || generationFailed ? [] : segments,
                    superseded: sup,
                    guardrailBlocked,
                    guardrailReason,
                    generationFailed,
                    usage,
                });
            };

            stream.on('data', async (chunk: Buffer) => {
                lineBuffer += decoder.write(chunk);
                const lines = lineBuffer.split('\n');
                lineBuffer = lines.pop() ?? '';
                for (const line of lines) consumeLine(line);

                // Throttled supersede check (avoid a Redis GET per chunk).
                const now = Date.now();
                if (!checking && !settled && now - lastCheck > 500) {
                    checking = true;
                    lastCheck = now;
                    pendingCheck = isCurrent()
                        .then(current => {
                            if (!current) {
                                superseded = true;
                                ac.abort();
                                finish(true);
                            }
                        })
                        .finally(() => {
                            checking = false;
                            pendingCheck = null;
                        });
                }
            });
            // Await any in-flight supersede check so the `end` handler sees the
            // correct `superseded` value — without this, `end` can fire while the
            // async Redis check is still pending and resolve `superseded: false`
            // even though the check would have returned `false` moments later.
            stream.on('end', async () => {
                if (pendingCheck) await pendingCheck;
                finish(superseded);
            });
            stream.on('error', (err: Error) => {
                // An abort we triggered surfaces as a stream error — that's a
                // supersession, not a failure.
                if (ac.signal.aborted || superseded) finish(true);
                else {
                    this.logger.warn(`stream error: ${err.message}`);
                    generationFailed = true;
                    finish(false);
                }
            });
        });
    }
}
