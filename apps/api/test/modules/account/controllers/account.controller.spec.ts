import { ConflictException } from '@nestjs/common';
import { AccountController } from '../../../../src/modules/account/controllers/account.controller';
import {
    ENUM_ACCOUNT_STATUS,
    ENUM_ACCOUNT_TYPE,
} from '../../../../src/modules/account/enums/account.enum';
import { UserEntity } from '../../../../src/modules/user/repository/entities/user.entity';

/** Builds a stub object whose every listed method is a jest.fn(). */
function stub<K extends string>(...methods: K[]): Record<K, jest.Mock> {
    return Object.fromEntries(methods.map(m => [m, jest.fn()])) as Record<
        K,
        jest.Mock
    >;
}

const accountService = stub(
    'findAll',
    'getTotal',
    'findOneByIdOrSlug',
    'findOne',
    'mapList',
    'mapDetail',
    'syncAccount',
    'deleteSyncAccount',
    'findAccountsNotBelongingToAnyChatbot'
);
const provisionService = stub(
    'provisionApiChannel',
    'rotateApiChannelSecret',
    'provisionWebsiteWidget'
);
const activityService = stub('createByUser');
const paginationService = stub('totalPage');

// The controller holds no state, so one instance serves every case.
const controller = new AccountController(
    accountService as any,
    provisionService as any,
    activityService as any,
    paginationService as any
);

const WORKSPACE_ID = 'workspace-id-1';
const workspace = { id: WORKSPACE_ID } as any;

describe('AccountController (workspace-scoped)', () => {
    beforeEach(() => jest.clearAllMocks());

    describe('link - OAuth account connect', () => {
        const linkUser = { id: 'user-id-1', name: 'Test User' } as UserEntity;

        const mockLinkedAccount = {
            id: 'account-id-linked',
            deleted: false,
            createdAt: new Date('2026-01-01'),
            updatedAt: new Date('2026-01-01'),
            link: 'https://example.com/profile',
            name: 'Linked Account',
            slug: 'linked-account',
            avatar: 'https://example.com/avatar.jpg',
            status: ENUM_ACCOUNT_STATUS.ACTIVE,
            type: ENUM_ACCOUNT_TYPE.FACEBOOK_ACCOUNT,
            workspace: { id: WORKSPACE_ID },
            pages: [],
            cookies: [],
            proxies: [],
        };

        const LINKABLE_PLATFORMS = [
            ENUM_ACCOUNT_TYPE.FACEBOOK_ACCOUNT,
            ENUM_ACCOUNT_TYPE.INSTAGRAM_ACCOUNT,
            ENUM_ACCOUNT_TYPE.ZALO_ACCOUNT,
            ENUM_ACCOUNT_TYPE.TIKTOK_SHOP,
            ENUM_ACCOUNT_TYPE.SHOPEE_SHOP,
        ];

        it.each(LINKABLE_PLATFORMS)(
            'routes %s to syncAccount with code, platform, workspaceId, and userId',
            async platform => {
                const dto = { code: 'auth-code', platform };
                accountService.syncAccount.mockResolvedValue({
                    ...mockLinkedAccount,
                    type: platform,
                });

                await controller.link(WORKSPACE_ID, dto, linkUser);

                expect(accountService.syncAccount).toHaveBeenCalledWith(
                    'auth-code',
                    platform,
                    WORKSPACE_ID,
                    linkUser.id,
                    linkUser.id
                );
            }
        );

        it('maps syncAccount result to AccountLinkResponseDto', async () => {
            const dto = {
                code: 'auth-code',
                platform: ENUM_ACCOUNT_TYPE.INSTAGRAM_ACCOUNT,
            };
            accountService.syncAccount.mockResolvedValue({
                ...mockLinkedAccount,
                type: ENUM_ACCOUNT_TYPE.INSTAGRAM_ACCOUNT,
                pages: [],
                cookies: [{}],
                proxies: [{}, {}],
            });

            const result = await controller.link(WORKSPACE_ID, dto, linkUser);

            expect(result).toStrictEqual({
                data: expect.objectContaining({
                    id: 'account-id-linked',
                    name: 'Linked Account',
                    slug: 'linked-account',
                    status: ENUM_ACCOUNT_STATUS.ACTIVE,
                    type: ENUM_ACCOUNT_TYPE.INSTAGRAM_ACCOUNT,
                    workspace: WORKSPACE_ID,
                    pages: [],
                    totalCookies: 1,
                    totalProxies: 2,
                }),
            });
        });

        it('upserts existing account when re-linking the same platform', async () => {
            const dto = {
                code: 'new-auth-code',
                platform: ENUM_ACCOUNT_TYPE.FACEBOOK_ACCOUNT,
            };
            // syncAccount handles upsert internally — controller just passes through
            accountService.syncAccount.mockResolvedValue({
                ...mockLinkedAccount,
                name: 'Updated Name',
                avatar: 'https://example.com/new-avatar.jpg',
            });

            const result = await controller.link(WORKSPACE_ID, dto, linkUser);

            expect(accountService.syncAccount).toHaveBeenCalledTimes(1);
            expect(result.data).toMatchObject({ name: 'Updated Name' });
        });

        it('propagates errors from syncAccount for any platform', async () => {
            const dto = {
                code: 'auth-code',
                platform: ENUM_ACCOUNT_TYPE.SHOPEE_SHOP,
            };
            accountService.syncAccount.mockRejectedValue(
                new Error('OAuth exchange failed')
            );

            await expect(
                controller.link(WORKSPACE_ID, dto, linkUser)
            ).rejects.toThrow('OAuth exchange failed');
        });
    });

    describe('list', () => {
        const pagination = {
            _search: {},
            _limit: 20,
            _offset: 0,
            _order: {},
        } as any;

        beforeEach(() => {
            accountService.findAll.mockResolvedValue([]);
            accountService.getTotal.mockResolvedValue(0);
            accountService.mapList.mockReturnValue([]);
            paginationService.totalPage.mockReturnValue(1);
        });

        // Regression test: deleteSyncAccount soft-deletes accounts that
        // still have conversation history, so the list query must exclude
        // deletedAt rows or a "deleted" account keeps showing up as linked.
        it('excludes soft-deleted accounts from the workspace list', async () => {
            await controller.list(workspace, pagination, {});

            expect(accountService.findAll).toHaveBeenCalledWith(
                expect.objectContaining({
                    workspace: workspace.id,
                    deletedAt: null,
                }),
                expect.anything()
            );
            expect(accountService.getTotal).toHaveBeenCalledWith(
                expect.objectContaining({ deletedAt: null })
            );
        });
    });

    describe('getDetail', () => {
        // S-9: a workspace user must not be able to read another workspace's
        // account by id — the lookup must be scoped to the caller's workspace.
        it('looks the account up scoped to the current workspace', async () => {
            accountService.findOneByIdOrSlug.mockResolvedValue({
                id: 'account-1',
            });
            accountService.mapDetail.mockReturnValue({ id: 'account-1' });

            await controller.getDetail(workspace, 'account-1');

            expect(accountService.findOneByIdOrSlug).toHaveBeenCalledWith(
                'account-1',
                expect.objectContaining({
                    populate: ['createdBy', 'updatedBy'],
                }),
                workspace.id
            );
        });

        it('404s when the service finds nothing (e.g. the account belongs to another workspace)', async () => {
            accountService.findOneByIdOrSlug.mockResolvedValue(null);

            await expect(
                controller.getDetail(workspace, 'account-1')
            ).rejects.toThrow(ConflictException);
        });
    });
});
