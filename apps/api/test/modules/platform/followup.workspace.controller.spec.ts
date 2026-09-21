import { ValidationPipe } from '@nestjs/common';
import { ENUM_FOLLOWUP_STATUS } from '../../../src/modules/platform/constants/followup.constant';
import { FollowupWorkspaceController } from '../../../src/modules/platform/controllers/followup.workspace.controller';

// Unit-level controller spec. Cross-workspace tenant isolation, 401/403,
// pagination clamping (page/perPage limits via @PaginationQuery), and the
// `:id` UUID check (`ParseUUIDPipe`) are enforced by Nest guards/pipes at the
// request boundary (@AuthJwtAccessProtected, @WorkspaceMemberOrOwnerProtected,
// @WorkspacePolicyAbilityProtected, ParseUUIDPipe) — see the workspace guard
// specs. Here we only assert the controller is a thin pass-through to
// FollowupService and shapes the paginated/response envelope correctly.

const mockFollowupService = {
    findAllByWorkspace: jest.fn(),
    cancelForWorkspace: jest.fn(),
    mapList: jest.fn(),
};

const mockPaginationService = {
    totalPage: jest.fn(),
};

function buildController(): FollowupWorkspaceController {
    return new FollowupWorkspaceController(
        mockFollowupService as any,
        mockPaginationService as any
    );
}

describe('FollowupWorkspaceController', () => {
    let controller: FollowupWorkspaceController;

    const workspace = { id: 'ws-1', name: 'Acme' } as any;

    beforeEach(() => {
        jest.clearAllMocks();
        controller = buildController();
    });

    describe('GET /:workspace/followups', () => {
        it('forwards filters + pagination to the service and wraps the paginated envelope', async () => {
            const items = [
                {
                    followupId: 'f-1',
                    chatbot: { id: 'cb-1', name: 'Bot', avatar: null },
                    conversationId: 'conv-1',
                    senderName: 'Alice',
                    triggerMessageId: 'msg-1',
                    reason: 'no reply',
                    status: ENUM_FOLLOWUP_STATUS.SCHEDULED,
                    scheduledAt: new Date(),
                    firedAt: null,
                    outcomeReason: null,
                    firesInMinutes: 10,
                },
            ];
            mockFollowupService.findAllByWorkspace.mockResolvedValue([
                items,
                1,
            ]);
            mockFollowupService.mapList.mockReturnValue(items);
            mockPaginationService.totalPage.mockReturnValue(1);

            const result = await controller.list(
                workspace,
                { _limit: 20, _offset: 0 } as any,
                'cb-1',
                'conv-1',
                'ali',
                ENUM_FOLLOWUP_STATUS.COMPLETED
            );

            expect(mockFollowupService.findAllByWorkspace).toHaveBeenCalledWith(
                'ws-1',
                {
                    conversationId: 'conv-1',
                    chatbotId: 'cb-1',
                    search: 'ali',
                    status: ENUM_FOLLOWUP_STATUS.COMPLETED,
                    limit: 20,
                    offset: 0,
                }
            );
            expect(mockPaginationService.totalPage).toHaveBeenCalledWith(1, 20);
            expect(result).toEqual({
                _pagination: { total: 1, totalPage: 1 },
                data: items,
            });
        });

        it('works with no filters supplied', async () => {
            mockFollowupService.findAllByWorkspace.mockResolvedValue([[], 0]);
            mockFollowupService.mapList.mockReturnValue([]);
            mockPaginationService.totalPage.mockReturnValue(0);

            const result = await controller.list(workspace, {
                _limit: 20,
                _offset: 0,
            } as any);

            expect(mockFollowupService.findAllByWorkspace).toHaveBeenCalledWith(
                'ws-1',
                {
                    conversationId: undefined,
                    chatbotId: undefined,
                    search: undefined,
                    status: undefined,
                    limit: 20,
                    offset: 0,
                }
            );
            expect(result).toEqual({
                _pagination: { total: 0, totalPage: 0 },
                data: [],
            });
        });

        it('forwards a non-first page (offset/limit) and multi-page total', async () => {
            mockFollowupService.findAllByWorkspace.mockResolvedValue([[], 25]);
            mockFollowupService.mapList.mockReturnValue([]);
            mockPaginationService.totalPage.mockReturnValue(3);

            const result = await controller.list(workspace, {
                _limit: 10,
                _offset: 10,
            } as any);

            expect(mockFollowupService.findAllByWorkspace).toHaveBeenCalledWith(
                'ws-1',
                expect.objectContaining({ limit: 10, offset: 10 })
            );
            expect(mockPaginationService.totalPage).toHaveBeenCalledWith(
                25,
                10
            );
            expect(result._pagination).toEqual({ total: 25, totalPage: 3 });
        });
    });

    describe('DELETE /:workspace/followups/:id', () => {
        it('delegates to cancelForWorkspace scoped to the workspace and wraps the result', async () => {
            mockFollowupService.cancelForWorkspace.mockResolvedValue({
                cancelled: true,
            });

            const result = await controller.cancel(workspace, 'f-1');

            expect(mockFollowupService.cancelForWorkspace).toHaveBeenCalledWith(
                'ws-1',
                'f-1'
            );
            expect(result).toEqual({ data: { cancelled: true } });
        });

        it('returns cancelled: false when the service reports the job could not be cancelled', async () => {
            mockFollowupService.cancelForWorkspace.mockResolvedValue({
                cancelled: false,
            });

            const result = await controller.cancel(workspace, 'other-ws-job');

            expect(result).toEqual({ data: { cancelled: false } });
        });
    });
});

// The unit specs above call the handler directly, so they never see the global
// ValidationPipe (RequestModule.forRoot). That pipe validates every param whose
// `design:paramtypes` entry is not a built-in — and a TS enum used as a param
// type annotation is emitted as the enum *object*, which class-validator has no
// metadata for. Under `forbidUnknownValues` that is an `unknownValue` error, so
// the route 422s on every request, query string or not.
describe('FollowupWorkspaceController query params vs the global ValidationPipe', () => {
    const pipe = new ValidationPipe({
        transform: true,
        skipUndefinedProperties: true,
        forbidUnknownValues: true,
    });

    const paramtypes: any[] = Reflect.getMetadata(
        'design:paramtypes',
        FollowupWorkspaceController.prototype,
        'list'
    );
    // list(workspace, pagination, chatbot, conversationId, search, status)
    const statusMetatype = paramtypes[5];

    it('lets a request through with no `status` in the query string', async () => {
        await expect(
            pipe.transform(undefined, {
                type: 'query',
                metatype: statusMetatype,
                data: 'status',
            })
        ).resolves.toBeUndefined();
    });

    it('lets a valid `status` through untouched', async () => {
        await expect(
            pipe.transform(ENUM_FOLLOWUP_STATUS.SCHEDULED, {
                type: 'query',
                metatype: statusMetatype,
                data: 'status',
            })
        ).resolves.toBe(ENUM_FOLLOWUP_STATUS.SCHEDULED);
    });
});
