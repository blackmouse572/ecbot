/** A ConversationMemoryService whose window is whatever the test's
 *  `findNewest` returns. */
export function memoryStub(messageRepository: {
    findNewest: (...args: any[]) => Promise<unknown[]>;
}) {
    return {
        window: async () => ({ rows: await messageRepository.findNewest() }),
    } as any;
}
