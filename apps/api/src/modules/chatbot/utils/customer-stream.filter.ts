import { UiStreamFrame } from './assistant-transcript.collector';

/**
 * Stream frames that show how the agent produced a reply: tool calls and their
 * results (`tool-*`, `data-tool-meta`), the knowledge search (`data-knowledge`,
 * `source-document`), reasoning, and the usage/sources metadata, which names
 * every knowledge item. The dashboard shows them to the business; a customer
 * gets the reply, plus `source-url` links to the public web pages it used
 * (#204).
 */
export function isAgentInternalFrame(frame: UiStreamFrame): boolean {
    const type = typeof frame.type === 'string' ? frame.type : '';
    return (
        type.startsWith('tool-') ||
        type.startsWith('reasoning-') ||
        type === 'source-document' ||
        type === 'data-tool-meta' ||
        type === 'data-knowledge' ||
        type === 'message-metadata'
    );
}
