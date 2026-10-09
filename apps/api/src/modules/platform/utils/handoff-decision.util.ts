import { IHandoffKeywordMatch } from '@app/modules/conversation/interfaces/conversation.service.interface';

/**
 * The handoff rule every channel uses: the owner's own keywords always hand
 * off; a default keyword only flags the message, since ordinary questions
 * contain them too ("hỗ trợ", "chuyển khoản"), so `wantsPerson` (the cheap
 * decision model) checks the customer really asks for a person.
 */
export async function shouldHandOff(
    match: IHandoffKeywordMatch | null,
    text: string,
    wantsPerson: (text: string, keyword: string) => Promise<boolean>
): Promise<boolean> {
    if (!match) return false;
    if (match.source === 'custom') return true;
    return wantsPerson(text, match.keyword);
}
