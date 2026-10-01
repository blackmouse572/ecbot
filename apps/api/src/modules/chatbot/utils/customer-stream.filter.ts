import { UiStreamFrame } from './assistant-transcript.collector';

/**
 * Stream frames that show how the agent produced a reply: tool calls and their
 * results (`tool-*`, `data-tool-meta`), the knowledge search (`data-knowledge`,
 * `source-*`), reasoning, and the usage/sources metadata. The dashboard shows
 * them to the business; a customer only ever gets the reply itself.
 */
export function isAgentInternalFrame(frame: UiStreamFrame): boolean {
    const type = typeof frame.type === 'string' ? frame.type : '';
    return (
        type.startsWith('tool-') ||
        type.startsWith('reasoning-') ||
        type.startsWith('source-') ||
        type === 'data-tool-meta' ||
        type === 'data-knowledge' ||
        type === 'message-metadata'
    );
}
