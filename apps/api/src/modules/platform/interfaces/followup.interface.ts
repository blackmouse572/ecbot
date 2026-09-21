import {
    ENUM_FOLLOWUP_PROCESS,
    ENUM_FOLLOWUP_STATUS,
} from '../constants/followup.constant';

/** Everything `fire()` needs to regenerate and deliver the followup message. */
export interface IFollowupJob {
    conversationId: string;
    chatbotId: string;
    userId: string;
    providerId: string;
    customerId: string;
    contactPointId: string;
    prompt: string;
    reason: string;
    triggerMessageId?: string;
}

/** The Cloud Task body: the job plus the id of the row that logs its outcome. */
export type IFollowupTaskPayload = IFollowupJob & {
    jobName: ENUM_FOLLOWUP_PROCESS.FIRE;
    /** Absent on tasks enqueued before followup logging shipped. */
    followupId?: string;
};

export interface IFollowupCreate {
    chatbotId: string;
    conversationId: string;
    prompt: string;
    reason: string;
    triggerMessageId?: string;
    scheduledAt: Date;
}

export interface IFollowupWorkspaceFilter {
    conversationId?: string;
    chatbotId?: string;
    status?: ENUM_FOLLOWUP_STATUS;
    search?: string;
    limit: number;
    offset: number;
}

export interface IFollowupOutcome {
    status: ENUM_FOLLOWUP_STATUS;
    outcomeReason?: string;
}
