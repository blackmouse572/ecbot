import { ENUM_CONVERSATION_ACTIVITY_KIND } from '@app/modules/conversation/enums/conversation-activity.enum';
import {
    IConversationActivitySource,
    IConversationActivityTool,
    IReplyActivity,
} from '@app/modules/conversation/interfaces/conversation-activity.interface';

/** The UI-message part fields the collector reads; parts are free-form JSON. */
type StreamPart = { type: string } & Record<string, unknown>;

/** `data-tool-meta` kinds of the built-in tools (apps/ai SYSTEM_TOOL_KINDS). */
const BUILT_IN_TOOL_KINDS = new Set(['customer', 'tag', 'followup', 'image']);

/**
 * Reads what the agent did off a reply stream (#286): skills it loaded,
 * built-in tool calls (a handoff tag among them) and the knowledge search
 * before the reply, with the sources apps/ai reports at the end. Registry
 * tool calls are not collected (the tool executor already persists them),
 * and neither is reasoning.
 */
export class ReplyActivityCollector {
    private readonly list: IReplyActivity[] = [];
    private readonly toolInputs = new Map<
        string,
        { name: string; input: Record<string, unknown> }
    >();
    private readonly toolCalls = new Map<string, IReplyActivity>();
    private knowledge?: IReplyActivity;

    observe(part: StreamPart): void {
        if (part.type === 'tool-input-available') {
            if (typeof part.toolCallId === 'string')
                this.toolInputs.set(part.toolCallId, {
                    name:
                        typeof part.toolName === 'string' ? part.toolName : '',
                    input: (part.input as Record<string, unknown>) ?? {},
                });
        } else if (part.type === 'data-tool-meta') {
            const kind = (part.data as { kind?: unknown } | undefined)?.kind;
            if (typeof part.id !== 'string' || typeof kind !== 'string') return;
            const call = this.toolInputs.get(part.id);
            if (BUILT_IN_TOOL_KINDS.has(kind)) {
                const activity: IReplyActivity = {
                    kind: ENUM_CONVERSATION_ACTIVITY_KIND.TOOL,
                    label: call?.name,
                    tool: { kind, args: call?.input ?? {} },
                    at: new Date(),
                };
                this.toolCalls.set(part.id, activity);
                this.list.push(activity);
                return;
            }
            if (kind !== 'skill') return;
            const slug = call?.input.slug;
            this.list.push({
                kind: ENUM_CONVERSATION_ACTIVITY_KIND.SKILL,
                ...(typeof slug === 'string' && { label: slug }),
                at: new Date(),
            });
        } else if (part.type === 'tool-output-available') {
            const tool =
                typeof part.toolCallId === 'string'
                    ? this.toolCalls.get(part.toolCallId)?.tool
                    : undefined;
            if (tool) applyToolOutput(tool, part.output);
        } else if (part.type === 'data-knowledge') {
            const count = (part.data as { count?: unknown } | undefined)?.count;
            if (typeof count !== 'number' || count <= 0) return;
            this.knowledge = {
                kind: ENUM_CONVERSATION_ACTIVITY_KIND.KNOWLEDGE,
                count,
                at: new Date(),
            };
            this.list.push(this.knowledge);
        } else if (part.type === 'message-metadata' && this.knowledge) {
            const sources = toSources(
                (part.messageMetadata as { sources?: unknown } | undefined)
                    ?.sources
            );
            if (sources.length) this.knowledge.sources = sources;
        }
    }

    get activities(): IReplyActivity[] {
        return this.list;
    }
}

/**
 * A built-in tool reports failure as `{ error }` or `{ ok: false, reason }`
 * (apps/ai system_tools.py); a tag that fired a handoff reads as a handoff.
 */
function applyToolOutput(
    tool: IConversationActivityTool,
    output: unknown
): void {
    const out = (output ?? {}) as Record<string, unknown>;
    if (typeof out.error === 'string') tool.error = out.error;
    else if (out.ok === false)
        tool.error = typeof out.reason === 'string' ? out.reason : '';
    else tool.result = output;
    if (tool.kind === 'tag' && out.triggeredHandoff === true)
        tool.kind = 'handoff';
}

/** apps/ai's `{ id, title, source_url }` sources, labelled by title only. */
function toSources(raw: unknown): IConversationActivitySource[] {
    if (!Array.isArray(raw)) return [];
    return raw
        .filter(
            (s): s is { id: string; title?: unknown; source_url?: unknown } =>
                typeof s?.id === 'string'
        )
        .map(s => ({
            id: s.id,
            ...(typeof s.title === 'string' && s.title && { title: s.title }),
            ...(typeof s.source_url === 'string' &&
                s.source_url && { sourceUrl: s.source_url }),
        }));
}
