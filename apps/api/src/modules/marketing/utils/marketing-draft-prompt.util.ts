import {
    MARKETING_DRAFT_CUSTOM_AUDIENCE,
    MARKETING_DRAFT_LANGUAGE_NAME,
    MARKETING_DRAFT_LENGTH,
    MARKETING_DRAFT_REWRITE,
    MARKETING_DRAFT_RULES,
    MARKETING_DRAFT_STAGE,
    MARKETING_DRAFT_TONE,
} from '../constants/marketing-draft.constant';
import {
    ENUM_MARKETING_DRAFT_REWRITE,
    ENUM_MARKETING_DRAFT_TONE,
} from '../enums/marketing-draft.enum';
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
    const current = input.previous?.trim();
    const rewrite = current
        ? MARKETING_DRAFT_REWRITE[
              input.rewrite ?? ENUM_MARKETING_DRAFT_REWRITE.DIFFERENT
          ].replace('{current}', current)
        : MARKETING_DRAFT_LENGTH;
    const lines = [
        `Write one message a shop sends to a customer on a chat app, in ${language}.`,
        `It goes to ${audience}`,
        rewrite,
        MARKETING_DRAFT_TONE[input.tone ?? ENUM_MARKETING_DRAFT_TONE.FRIENDLY],
        ...MARKETING_DRAFT_RULES,
    ];
    const offer = input.offer?.trim() || 'none';
    return {
        instructions: lines.join('\n'),
        state: `Shop: ${shopName}\nOffer: ${offer}`,
    };
}
