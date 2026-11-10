import { UniqueConstraintViolationException } from '@mikro-orm/core';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ENUM_ACCOUNT_TYPE } from '../../../src/modules/account/enums/account.enum';
import {
    ENUM_TRACKED_LINK_KIND,
    ENUM_TRACKED_LINK_STATUS,
} from '../../../src/modules/customer/enums/tracked-link.enum';
import { TrackedLinkService } from '../../../src/modules/customer/services/tracked-link.service';
import { TRACKED_LINK_CHILD_CODE_MAX_LENGTH } from '../../../src/modules/customer/constants/tracked-link.constant';

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
        createLink: jest.fn(async (data: any) => ({
            id: 'tl-new',
            ...data,
            account: page,
        })),
        findInWorkspace: jest.fn(),
        findChildren: jest.fn(),
        findCodesStartingWith: jest.fn(),
        updateEntity: jest.fn(),
        updateRaw: jest.fn(),
        save: jest.fn(async (e: any) => e),
        find: jest.fn(),
    };
    const accountRepository = { findOne: jest.fn() };
    const customerTagRepository = { findByWorkspace: jest.fn() };
    const marketingStateRepository = { statsByFirstSource: jest.fn() };

    let service: TrackedLinkService;

    beforeEach(() => {
        jest.clearAllMocks();
        accountRepository.findOne.mockResolvedValue(page);
        trackedLinkRepository.findCodesStartingWith.mockResolvedValue([]);
        customerTagRepository.findByWorkspace.mockResolvedValue([]);
        service = new TrackedLinkService(
            trackedLinkRepository as any,
            accountRepository as any,
            customerTagRepository as any,
            marketingStateRepository as any
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
            expect(trackedLinkRepository.createLink).toHaveBeenCalledWith(
                expect.objectContaining({
                    workspaceId: 'ws-1',
                    accountId: 'acc-1',
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

            expect(trackedLinkRepository.createLink).toHaveBeenCalledWith(
                expect.objectContaining({ code: 'to-roi-tet-3' })
            );
        });

        it('picks a new code when a create at the same moment took it', async () => {
            trackedLinkRepository.findCodesStartingWith
                .mockResolvedValueOnce([])
                .mockResolvedValueOnce(['to-roi-tet']);
            trackedLinkRepository.createLink.mockRejectedValueOnce(
                new UniqueConstraintViolationException(new Error('23505'))
            );

            const link = await service.create('ws-1', {
                name: 'Tờ rơi Tết',
                accountId: 'acc-1',
            });

            expect(link.code).toBe('to-roi-tet-2');
        });

        it('returns the link ready to show, with its url', async () => {
            const link = await service.create('ws-1', {
                name: 'Tờ rơi Tết',
                accountId: 'acc-1',
            });

            expect(service.mapGet(link).url).toBe(
                'https://m.me/1234?ref=to-roi-tet'
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

            expect(trackedLinkRepository.createLink).toHaveBeenCalledWith(
                expect.objectContaining({
                    workspaceId: 'ws-1',
                    parentId: 'tl-1',
                    accountId: 'acc-1',
                    kind: ENUM_TRACKED_LINK_KIND.KOL,
                    name: 'Linh Đan',
                    code: 'to-roi-tet-linh-dan',
                })
            );
        });

        it('keeps a long KOL code inside the 64 characters Telegram allows', async () => {
            const long = 'a'.repeat(40);
            trackedLinkRepository.findInWorkspace.mockResolvedValue({
                ...parent,
                code: `${long}-9`,
            });

            await service.createChild('ws-1', 'tl-1', {
                name: 'b'.repeat(40),
                kind: ENUM_TRACKED_LINK_KIND.KOL,
            });

            const { code } = trackedLinkRepository.createLink.mock.calls[0][0];
            expect(code.length).toBeLessThanOrEqual(
                TRACKED_LINK_CHILD_CODE_MAX_LENGTH
            );
            expect(code).toMatch(/^a{40}-9-b+$/);
        });

        it('gives a website QR code the source page, so it has a url', async () => {
            trackedLinkRepository.findInWorkspace.mockResolvedValue({
                ...parent,
                account: { ...page, type: ENUM_ACCOUNT_TYPE.WEBSITE_WIDGET },
                targetUrl: 'https://lumi.vn/khuyen-mai',
            });

            await service.createChild('ws-1', 'tl-1', {
                name: 'Quầy quận 1',
                kind: ENUM_TRACKED_LINK_KIND.QR,
            });

            expect(trackedLinkRepository.createLink).toHaveBeenCalledWith(
                expect.objectContaining({
                    targetUrl: 'https://lumi.vn/khuyen-mai',
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

        it('moves a website source and its codes to the new page', async () => {
            trackedLinkRepository.findInWorkspace.mockResolvedValue({
                id: 'tl-1',
                kind: ENUM_TRACKED_LINK_KIND.LINK,
                account: { ...page, type: ENUM_ACCOUNT_TYPE.WEBSITE_WIDGET },
                targetUrl: 'https://lumi.vn/a',
            });

            await service.update('ws-1', 'tl-1', {
                targetUrl: 'https://lumi.vn/b',
            });

            expect(trackedLinkRepository.updateRaw).toHaveBeenCalledWith(
                { parent: 'tl-1' },
                { targetUrl: 'https://lumi.vn/b' }
            );
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

    // #503 part 3: counts come from each customer's first source, and a
    // source counts the customers its QR and KOL codes brought in.
    describe('stats', () => {
        const link = (id: string, parent?: { id: string }) => ({
            id,
            name: id,
            code: id,
            kind: ENUM_TRACKED_LINK_KIND.LINK,
            status: ENUM_TRACKED_LINK_STATUS.ACTIVE,
            account: page,
            parent: parent ?? null,
            tagIds: [],
            createdAt: new Date(),
        });
        const tet = link('tet');
        const qr = link('tet-qr', tet);
        const kol = link('tet-kol', tet);
        const blackFriday = link('black-friday');

        beforeEach(() => {
            marketingStateRepository.statsByFirstSource.mockResolvedValue([
                {
                    linkId: 'tet',
                    newCustomers: 10,
                    potentialCustomers: 3,
                    orders: 2,
                },
                {
                    linkId: 'tet-qr',
                    newCustomers: 5,
                    potentialCustomers: 1,
                    orders: 1,
                },
                {
                    linkId: 'tet-kol',
                    newCustomers: 1,
                    potentialCustomers: 1,
                    orders: 0,
                },
            ]);
        });

        it('adds the codes into their source on the list, and zero for none', async () => {
            trackedLinkRepository.find.mockResolvedValue([qr, kol]);

            const rows = await service.mapListWithStats('ws-1', [
                tet,
                blackFriday,
            ] as any);

            expect(
                marketingStateRepository.statsByFirstSource
            ).toHaveBeenCalledWith('ws-1', [
                'tet',
                'black-friday',
                'tet-qr',
                'tet-kol',
            ]);
            expect(rows.map(r => [r.id, r.stats])).toEqual([
                ['tet', { newCustomers: 16, potentialCustomers: 5, orders: 3 }],
                [
                    'black-friday',
                    { newCustomers: 0, potentialCustomers: 0, orders: 0 },
                ],
            ]);
        });

        it('shows each code on its own on the detail page', async () => {
            const detail = await service.mapDetailWithStats(
                'ws-1',
                tet as any,
                [qr, kol] as any
            );

            expect(detail.stats).toEqual({
                newCustomers: 16,
                potentialCustomers: 5,
                orders: 3,
            });
            expect(
                detail.children.map(c => [c.id, c.stats?.newCustomers])
            ).toEqual([
                ['tet-qr', 5],
                ['tet-kol', 1],
            ]);
        });
    });
});
