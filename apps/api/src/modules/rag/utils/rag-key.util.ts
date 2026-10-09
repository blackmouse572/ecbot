// What RAGService.generateS3Key builds after the prefix: a slugified name and
// a known extension, no further folders.
const RAG_FILE_NAME = /^[a-z0-9-]*\.[a-z0-9]+$/;

/** Folder of one chatbot's RAG uploads in the private bucket. */
export function ragKeyPrefix(workspaceId: string, chatbotId: string): string {
    return `rag/${workspaceId}/${chatbotId}/`;
}

/**
 * True when the key is one upload-file could have issued for this chatbot.
 * The private bucket also holds other tenants' files, and deleting a RAG
 * entry deletes its key, so a client-sent key must never point elsewhere.
 */
export function isRagUploadKey(
    key: string,
    workspaceId: string,
    chatbotId: string
): boolean {
    const prefix = ragKeyPrefix(workspaceId, chatbotId);
    return (
        key.startsWith(prefix) && RAG_FILE_NAME.test(key.slice(prefix.length))
    );
}
