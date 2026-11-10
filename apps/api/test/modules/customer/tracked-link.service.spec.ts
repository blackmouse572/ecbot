import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ENUM_ACCOUNT_TYPE } from '../../../src/modules/account/enums/account.enum';
import {
    ENUM_TRACKED_LINK_KIND,
    ENUM_TRACKED_LINK_STATUS,
} from '../../../src/modules/customer/enums/tracked-link.enum';
import { TrackedLinkService } from '../../../src/modules/customer/services/tracked-link.service';

describe('TrackedLinkService', () => {
    const page = {
        id: 'acc-1',
        name: 'Lumi Skincare',
        type: ENUM_ACCOUNT_TYPE.FACEBOOK_PAGE,
        externalId: '1234',
        link: 'https://www.facebook.com/1234',
        workspace: { id: 'ws-1' },
    };

    const trackedLinkRepository = {
        create: jest.fn(async (data: any) => ({ id: 'tl-new', ...data })),
        findInWorkspace: jest.fn(),
        findChildren: jest.fn(),
        findCodesStartingWith: jest.fn(),
        updateEntity: jest.fn(),
        updateRaw: jest.fn(),
        save: jest.fn(async (e: any) => e),
    };
    const accountRepository = { findOne: jest.fn() };
    const customerTagRepository = { findByWorkspace: jest.fn() };

    let service: TrackedLinkService;

    beforeEach(() => {
        jest.clearAllMocks();
        accountRepository.findOne.mockResolvedValue(page);
        trackedLinkRepository.findCodesStartingWith.mockResolvedValue([]);
        customerTagRepository.findByWorkspace.mockResolvedValue([]);
        service = new TrackedLinkService(
            trackedLinkRepository as any,
            accountRepository as any,
            customerTagRepository as any
        );
    });

    describe('create', () => {
        it('stores a source with a code made from its name', async () => {
            const link = await service.create('ws-1', {
                name: 'Tờ rơi Tết',
                accountId: 'acc-1',
            });

            expect(accountRepository.findOne).toHaveBeenCalledWith(
                expect.objectContaining({ id: 'acc-1', workspace: 'ws-1' })
            );
            expect(trackedLinkRepository.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    workspace: 'ws-1',
                    account: 'acc-1',
                    name: 'Tờ rơi Tết',
                    code: 'to-roi-tet',
                    kind: ENUM_TRACKED_LINK_KIND.LINK,
                    tagIds: [],
                    promisesOffer: false,
                })
            );
            expect(link.code).toBe('to-roi-tet');
        });

        it('adds a number when the code is taken', async () => {
            trackedLinkRepository.findCodesStartingWith.mockResolvedValue([
                'to-roi-tet',
                'to-roi-tet-2',
            ]);

            await service.create('ws-1', {
                name: 'Tờ rơi Tết',
                accountId: 'acc-1',
            });

            expect(trackedLinkRepository.create).toHaveBeenCalledWith(
                expect.objectContaining({ code: 'to-roi-tet-3' })
            );
        });

        it('404s for an account outside the workspace', async () => {
            accountRepository.findOne.mockResolvedValue(null);

            await expect(
                service.create('ws-1', { name: 'X', accountId: 'other' })
            ).rejects.toBeInstanceOf(NotFoundException);
        });

        it('rejects a channel that cannot carry a code', async () => {
            accountRepository.findOne.mockResolvedValue({
                ...page,
                type: ENUM_ACCOUNT_TYPE.ZALO_PAGE,
            });

            await expect(
                service.create('ws-1', { name: 'X', accountId: 'acc-1' })
            ).rejects.toBeInstanceOf(BadRequestException);
        });

        it('needs a page for a website link', async () => {
            accountRepository.findOne.mockResolvedValue({
                ...page,
                type: ENUM_ACCOUNT_TYPE.WEBSITE_WIDGET,
            });

            await expect(
                service.create('ws-1', { name: 'X', accountId: 'acc-1' })
            ).rejects.toBeInstanceOf(BadRequestException);
        });

        it('rejects tags from another workspace', async () => {
            customerTagRepository.findByWorkspace.mockResolvedValue([
                { id: 'tag-1' },
            ]);

            await expect(
                service.create('ws-1', {
                    name: 'X',
                    accountId: 'acc-1',
                    tagIds: ['tag-1', 'tag-foreign'],
                })
            ).rejects.toBeInstanceOf(BadRequestException);
        });
    });

    describe('createChild', () => {
        const parent = {
            id: 'tl-1',
            code: 'to-roi-tet',
            kind: ENUM_TRACKED_LINK_KIND.LINK,
            account: page,
            workspace: { id: 'ws-1' },
        };

        it('gives a KOL its own code under the source', async () => {
            trackedLinkRepository.findInWorkspace.mockResolvedValue(parent);

            await service.createChild('ws-1', 'tl-1', {
                name: 'Linh Đan',
                kind: ENUM_TRACKED_LINK_KIND.KOL,
            });

            expect(trackedLinkRepository.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    workspace: 'ws-1',
                    parent: 'tl-1',
                    account: 'acc-1',
                    kind: ENUM_TRACKED_LINK_KIND.KOL,
                    name: 'Linh Đan',
                    code: 'to-roi-tet-linh-dan',
                })
            );
        });

        it('only nests under a source, never under a child', async () => {
            trackedLinkRepository.findInWorkspace.mockResolvedValue({
                ...parent,
                kind: ENUM_TRACKED_LINK_KIND.KOL,
                parent: { id: 'tl-0' },
            });

            await expect(
                service.createChild('ws-1', 'tl-1', {
                    name: 'X',
                    kind: ENUM_TRACKED_LINK_KIND.QR,
                })
            ).rejects.toBeInstanceOf(BadRequestException);
        });
    });

    describe('update', () => {
        it('stops a source', async () => {
            const link = {
                id: 'tl-1',
                kind: ENUM_TRACKED_LINK_KIND.LINK,
                status: ENUM_TRACKED_LINK_STATUS.ACTIVE,
                account: page,
            };
            trackedLinkRepository.findInWorkspace.mockResolvedValue(link);

            const updated = await service.update('ws-1', 'tl-1', {
                status: ENUM_TRACKED_LINK_STATUS.STOPPED,
            });

            expect(updated.status).toBe(ENUM_TRACKED_LINK_STATUS.STOPPED);
            expect(trackedLinkRepository.save).toHaveBeenCalledWith(link);
        });

        it('404s for a link outside the workspace', async () => {
            trackedLinkRepository.findInWorkspace.mockResolvedValue(null);

            await expect(
                service.update('ws-1', 'tl-x', { name: 'Y' })
            ).rejects.toBeInstanceOf(NotFoundException);
        });
    });

    describe('delete', () => {
        it('soft deletes the source and its codes', async () => {
            trackedLinkRepository.findInWorkspace.mockResolvedValue({
                id: 'tl-1',
            });

            await service.delete('ws-1', 'tl-1');

            expect(trackedLinkRepository.updateRaw).toHaveBeenCalledWith(
                { $or: [{ id: 'tl-1' }, { parent: 'tl-1' }] },
                expect.objectContaining({ deleted: true })
            );
        });
    });

    describe('mapGet', () => {
        it('returns the customer-facing url', () => {
            const dto = service.mapGet({
                id: 'tl-1',
                name: 'Tờ rơi Tết',
                code: 'to-roi-tet',
                kind: ENUM_TRACKED_LINK_KIND.LINK,
                status: ENUM_TRACKED_LINK_STATUS.ACTIVE,
                tagIds: [],
                promisesOffer: false,
                account: page,
                createdAt: new Date(),
            } as any);

            expect(dto.url).toBe('https://m.me/1234?ref=to-roi-tet');
            expect(dto.account).toEqual({
                id: 'acc-1',
                name: 'Lumi Skincare',
                type: ENUM_ACCOUNT_TYPE.FACEBOOK_PAGE,
            });
        });
    });
});
