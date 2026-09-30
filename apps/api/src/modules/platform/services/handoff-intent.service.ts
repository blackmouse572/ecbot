import { AiDecisionService } from '@app/modules/agent-builder/services/ai-decision.service';
import { Injectable, Logger } from '@nestjs/common';
import type { SystemOneQuestion } from '@repo/agent-blueprint';
import {
    HANDOFF_INTENT_MIN_CONFIDENCE,
    HANDOFF_INTENT_QUESTION_ID,
    HANDOFF_INTENT_TIMEOUT_MS,
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
 * Checks, with the cheap decision model, that a message flagged by a default
 * handoff keyword really asks for a person. Default keywords alone handed off
 * ordinary questions ("Shop có hỗ trợ ship COD không?").
 */
@Injectable()
export class HandoffIntentService {
    private readonly logger = new Logger(HandoffIntentService.name);

    constructor(private readonly aiDecision: AiDecisionService) {}

    /**
     * True on a confident yes, and when the check cannot answer (the call
     * fails or the model returns nothing): the agent runs on the same service
     * and would fail too, so hand off as before. A confident no or an unsure
     * answer is false: the agent replies, and can still hand off through its
     * tag tool.
     */
    async wantsPerson(message: string, keyword: string): Promise<boolean> {
        let answer;
        try {
            const answers = await this.aiDecision.systemOne(
                `Customer message: ${JSON.stringify(message)}\nHandoff keyword found: ${JSON.stringify(keyword)}`,
                QUESTIONS,
                HANDOFF_INTENT_TIMEOUT_MS
            );
            answer = answers[HANDOFF_INTENT_QUESTION_ID];
        } catch (err: unknown) {
            this.logger.warn(
                `Handoff intent check failed for keyword "${keyword}", handing off: ${(err as Error)?.message}`
            );
            return true;
        }
        if (answer?.type !== 'choice') {
            this.logger.warn(
                `Handoff intent check gave no answer for keyword "${keyword}", handing off`
            );
            return true;
        }
        this.logger.log(
            `Handoff intent for keyword "${keyword}": ${answer.choice} (${answer.confidence})`
        );
        return (
            answer.choice === HANDOFF_INTENT_WANTS_PERSON &&
            answer.confidence >= HANDOFF_INTENT_MIN_CONFIDENCE
        );
    }
}
