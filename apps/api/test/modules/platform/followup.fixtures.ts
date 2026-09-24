import {
    ENUM_FOLLOWUP_STATUS,
    PENDING_FOLLOWUP_STATUSES,
} from '@app/modules/platform/constants/followup.constant';
import {
    IFollowupCreate,
    IFollowupOutcome,
    IFollowupWorkspaceFilter,
} from '@app/modules/platform/interfaces/followup.interface';

export type FollowupRow = Record<string, any>;

const matches = (row: FollowupRow, where: FollowupRow): boolean =>
    Object.entries(where ?? {}).every(([key, expected]) => {
        const actual = row?.[key];
        if (expected === null) return (actual ?? null) === null;
        if (
            expected &&
            typeof expected === 'object' &&
            !(expected instanceof Date)
        ) {
            if ('$in' in expected) {
                return (expected as { $in: unknown[] }).$in.includes(actual);
            }
            if ('$ilike' in expected) {
                const needle = String((expected as { $ilike: string }).$ilike)
                    .replace(/%/g, '')
                    .toLowerCase();
                return String(actual ?? '')
                    .toLowerCase()
                    .includes(needle);
            }
            return matches(actual, expected as FollowupRow);
        }
        // A scalar against a relation matches on the related id.
        if (actual && typeof actual === 'object' && 'id' in actual) {
            return actual.id === expected;
        }
        return actual === expected;
    });

/** In-memory stand-in for the FollowupRepository query surface. */
export function makeFollowupRepository(rows: FollowupRow[] = []) {
    let sequence = 0;
    const find = (where: FollowupRow) =>
        rows.filter(row => matches(row, where));
    const update = (id: string, data: FollowupRow) => {
        const row = rows.find(candidate => candidate.id === id);
        if (row) Object.assign(row, data);
    };

    return {
        rows,
        createScheduled: jest.fn(async (data: IFollowupCreate) => {
            const row = followupRow({
                id: `followup-row-${++sequence}`,
                chatbot: { id: data.chatbotId, name: '', avatar: null },
                conversation: { id: data.conversationId, senderName: null },
                prompt: data.prompt,
                reason: data.reason,
                triggerMessageId: data.triggerMessageId ?? null,
                scheduledAt: data.scheduledAt,
            });
            rows.push(row);
            return row;
        }),
        deleteById: jest.fn(async (id: string) => {
            const index = rows.findIndex(row => row.id === id);
            if (index >= 0) rows.splice(index, 1);
        }),
        findById: jest.fn(
            async (id: string) => find({ id, deletedAt: null })[0] ?? null
        ),
        findPendingById: jest.fn(
            async (id: string, workspaceId?: string, conversationId?: string) =>
                find({
                    id,
                    status: { $in: PENDING_FOLLOWUP_STATUSES },
                    deletedAt: null,
                    ...(workspaceId
                        ? {
                              chatbot: {
                                  workspace: workspaceId,
                                  deletedAt: null,
                              },
                          }
                        : {}),
                    ...(conversationId ? { conversation: conversationId } : {}),
                })[0] ?? null
        ),
        findScheduledByConversation: jest.fn(async (conversationId: string) =>
            find({
                conversation: conversationId,
                status: ENUM_FOLLOWUP_STATUS.SCHEDULED,
                deletedAt: null,
            }).sort((a, b) => a.scheduledAt.getTime() - b.scheduledAt.getTime())
        ),
        findAllByWorkspace: jest.fn(
            async (workspaceId: string, filter: IFollowupWorkspaceFilter) => {
                const conversation = {
                    ...(filter.conversationId
                        ? { id: filter.conversationId }
                        : {}),
                    ...(filter.search
                        ? { senderName: { $ilike: `%${filter.search}%` } }
                        : {}),
                };
                const found = find({
                    chatbot: {
                        workspace: workspaceId,
                        deletedAt: null,
                        ...(filter.chatbotId ? { id: filter.chatbotId } : {}),
                    },
                    deletedAt: null,
                    ...(filter.status ? { status: filter.status } : {}),
                    ...(Object.keys(conversation).length
                        ? { conversation }
                        : {}),
                }).sort(
                    (a, b) => b.scheduledAt.getTime() - a.scheduledAt.getTime()
                );

                return [
                    found.slice(filter.offset, filter.offset + filter.limit),
                    found.length,
                ];
            }
        ),
        applyOutcome: jest.fn(async (id: string, outcome: IFollowupOutcome) =>
            update(id, {
                status: outcome.status,
                firedAt: new Date(),
                outcomeReason: outcome.outcomeReason ?? null,
            })
        ),
        markCancelled: jest.fn(async (id: string) =>
            update(id, {
                status: ENUM_FOLLOWUP_STATUS.CANCELLED,
                cancelledAt: new Date(),
            })
        ),
        incrementAttempts: jest.fn(async (id: string, attempts: number) =>
            update(id, { attempts: attempts + 1 })
        ),
        getTotal: jest.fn(async (where: FollowupRow) => find(where).length),
    };
}

/** A SCHEDULED row as the repository would return it, relations populated. */
export function followupRow(overrides: FollowupRow = {}): FollowupRow {
    return {
        id: 'f-1',
        chatbot: {
            id: 'cb-1',
            name: 'Beauty',
            avatar: null,
            workspace: 'ws-1',
        },
        conversation: { id: 'conv-1', senderName: 'Alice' },
        prompt: 'check payment',
        reason: 'payment_check',
        triggerMessageId: null,
        status: ENUM_FOLLOWUP_STATUS.SCHEDULED,
        scheduledAt: new Date(),
        firedAt: null,
        cancelledAt: null,
        outcomeReason: null,
        attempts: 0,
        deletedAt: null,
        ...overrides,
    };
}
