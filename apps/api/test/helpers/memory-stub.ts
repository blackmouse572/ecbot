/** A ConversationMemoryService with no summary whose window is whatever the
 *  test's `findRecentByConversation` returns. */
export function memoryStub(messageRepository: {
    findRecentByConversation: (...args: any[]) => Promise<unknown[]>;
}) {
    return {
        window: async (conversationId: string) => ({
            rows: await messageRepository.findRecentByConversation(
                conversationId
            ),
        }),
    } as any;
}
