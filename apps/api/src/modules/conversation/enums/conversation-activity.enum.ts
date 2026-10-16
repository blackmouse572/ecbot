/** What the agent did for a channel reply, shown in the operator trace. */
export enum ENUM_CONVERSATION_ACTIVITY_KIND {
    SKILL = 'SKILL',
    KNOWLEDGE = 'KNOWLEDGE',
    TOOL = 'TOOL',
    /** The agent chose to send nothing (an ok sticker after its answer). */
    NO_REPLY = 'NO_REPLY',
}
