import {
    MARKETING_DRAFT_CUSTOM_AUDIENCE,
    MARKETING_DRAFT_LANGUAGE_NAME,
    MARKETING_DRAFT_RULES,
    MARKETING_DRAFT_STAGE,
} from '../constants/marketing-draft.constant';
import { IMarketingDraftInput } from '../interfaces/marketing-draft.interface';

/** The instructions and state apps/ai writes a marketing offer from. */
export function marketingDraftPrompt(
    shopName: string,
    input: IMarketingDraftInput
): { instructions: string; state: string } {
    const audience = input.preset
        ? MARKETING_DRAFT_STAGE[input.preset]
        : MARKETING_DRAFT_CUSTOM_AUDIENCE;
    const language = MARKETING_DRAFT_LANGUAGE_NAME[input.language ?? 'vi'];
    const lines = [
        `Write one message a shop sends to a customer on a chat app, in ${language}.`,
        `It goes to ${audience}`,
        ...MARKETING_DRAFT_RULES,
    ];
    if (input.previous?.trim()) {
        lines.push(
            `Write a different version from this one: ${input.previous.trim()}`
        );
    }
    const offer = input.offer?.trim() || 'none';
    return {
        instructions: lines.join('\n'),
        state: `Shop: ${shopName}\nOffer: ${offer}`,
    };
}
