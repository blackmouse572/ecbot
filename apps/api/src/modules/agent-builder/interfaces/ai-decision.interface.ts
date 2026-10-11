import type { SystemOneAnswer } from '@repo/agent-blueprint';
import { TokenUsageDelta } from '@app/modules/chatbot/interfaces/token-usage-wire.interface';

export interface ISystemOneResult {
    answers: Record<string, SystemOneAnswer>;
    /** What the call spent; null when apps/ai reported nothing. */
    usage: TokenUsageDelta | null;
    model?: string;
}
