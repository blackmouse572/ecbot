import { AiDecisionService } from '@app/modules/agent-builder/services/ai-decision.service';
import { Injectable, Logger } from '@nestjs/common';
import type { SystemOneQuestion } from '@repo/agent-blueprint';
import {
    HANDOFF_INTENT_MIN_CONFIDENCE,
    HANDOFF_INTENT_QUESTION_ID,
    HANDOFF_INTENT_WANTS_PERSON,
} from '../constants/handoff.constant';

const QUESTIONS: Record<string, SystemOneQuestion> = {
    [HANDOFF_INTENT_QUESTION_ID]: {
        type: 'choice',
        instructions:
            'The state is a message a customer sent to a shop chatbot, and the handoff keyword it contains. Is the customer asking to talk to a person (staff, owner, a human) instead of the bot?',
        criteria: {
            [HANDOFF_INTENT_WANTS_PERSON]:
                'Yes: they ask for a person, staff or human to take over.',
            not_asking:
                'No: the keyword is part of an ordinary question or statement.',
        },
    },
};

/**
 * Confirms, with the cheap decision model, that a message flagged by a handoff
 * keyword really asks for a person. Keywords alone handed off ordinary
 * questions ("Shop có hỗ trợ ship COD không?").
 */
@Injectable()
export class HandoffIntentService {
    private readonly logger = new Logger(HandoffIntentService.name);

    constructor(private readonly aiDecision: AiDecisionService) {}

    /**
     * True only on a confident yes. Unsure, no answer or a failed call are all
     * false: the agent then answers, and can still hand off through its tag
     * tool, while a wrong handoff would silence the bot and page every member.
     */
    async wantsPerson(message: string, keyword: string): Promise<boolean> {
        try {
            const answers = await this.aiDecision.systemOne(
                `Customer message: "${message}"\nHandoff keyword found: "${keyword}"`,
                QUESTIONS
            );
            const answer = answers[HANDOFF_INTENT_QUESTION_ID];
            if (answer?.type !== 'choice') return false;
            this.logger.log(
                `Handoff intent for keyword "${keyword}": ${answer.choice} (${answer.confidence})`
            );
            return (
                answer.choice === HANDOFF_INTENT_WANTS_PERSON &&
                answer.confidence >= HANDOFF_INTENT_MIN_CONFIDENCE
            );
        } catch (err: unknown) {
            this.logger.warn(
                `Handoff intent check failed, leaving it to the agent: ${(err as Error)?.message}`
            );
            return false;
        }
    }
}
