import { ConflictException, NotFoundException } from '@nestjs/common';
import { ProductGroupService } from 'src/modules/order/services/product-group.service';

describe('ProductGroupService', () => {
    const productGroupRepository = {
        find: jest.fn(),
        findOne: jest.fn(),
        exists: jest.fn(),
        create: jest.fn(),
        save: jest.fn(),
        delete: jest.fn(),
        refreshLearnedRepurchaseDays: jest.fn(),
    };
    const service = new ProductGroupService(productGroupRepository as any);

    beforeEach(() => jest.clearAllMocks());

    it('uses the learned cycle when there is one, else the default', () => {
        const [learned, fallback] = service.mapList([
            {
                id: 'g1',
                name: 'Serum',
                defaultRepurchaseDays: 30,
                learnedRepurchaseDays: 41,
                createdAt: new Date(),
            },
            {
                id: 'g2',
                name: 'Kem',
                defaultRepurchaseDays: 60,
                createdAt: new Date(),
            },
        ] as any);
        expect(learned.repurchaseDays).toBe(41);
        expect(fallback.repurchaseDays).toBe(60);
    });

    it('matches an item to the group with the longest name it contains', () => {
        const groups = [
            { id: 'g1', name: 'Kem' },
            { id: 'g2', name: 'kem chống nắng' },
            { id: 'g3', name: 'Serum' },
        ] as any;
        expect(
            service.matchItemName('Kem Chống Nắng SPF50 50ml', groups)?.id
        ).toBe('g2');
        expect(service.matchItemName('Kem dưỡng ẩm', groups)?.id).toBe('g1');
        expect(service.matchItemName('Mặt nạ ngủ', groups)).toBeUndefined();
    });

    it('rejects a duplicate name in the workspace', async () => {
        productGroupRepository.exists.mockResolvedValue(true);
        await expect(
            service.create('w1', { name: 'Serum' })
        ).rejects.toBeInstanceOf(ConflictException);
    });

    it('404s a group from another workspace on delete', async () => {
        productGroupRepository.findOne.mockResolvedValue(null);
        await expect(service.delete('g1', 'w1')).rejects.toBeInstanceOf(
            NotFoundException
        );
    });

    it('refreshes the learned cycles through the repository', async () => {
        await service.refreshLearnedCycles(['g1', 'g2']);
        expect(
            productGroupRepository.refreshLearnedRepurchaseDays
        ).toHaveBeenCalledWith(['g1', 'g2']);
    });

    it('shows the photo by its CDN URL, else its stored URL, and the link', () => {
        const base = { id: 'g1', name: 'Serum', createdAt: new Date() };
        const [cdn, stored, none] = service.mapList([
            {
                ...base,
                image: {
                    cdnUrl: 'https://cdn/a.jpg',
                    completedUrl: 'https://s3/a.jpg',
                },
                link: 'https://shop.vn/serum',
            },
            { ...base, image: { completedUrl: 'https://s3/b.jpg' } },
            base,
        ] as any);
        expect(cdn).toMatchObject({
            imageUrl: 'https://cdn/a.jpg',
            link: 'https://shop.vn/serum',
        });
        expect(stored.imageUrl).toBe('https://s3/b.jpg');
        expect(none).toMatchObject({ imageUrl: null, link: null });
    });

    it('issues photo keys under the group, so a key from elsewhere is refused', () => {
        const group = { id: 'g1', workspace: { id: 'ws1' } } as any;
        const key = service.newImageKey(group, 'image/png' as any);
        expect(key).toMatch(/^workspace\/ws1\/product-group\/g1\/[\w-]+\.png$/);
        expect(key.startsWith(service.imageKeyPrefix(group))).toBe(true);
    });

    it('clears the link with null and keeps it when left out', async () => {
        const group = { id: 'g1', name: 'Serum', link: 'https://a.vn' };
        productGroupRepository.findOne.mockResolvedValue(group);
        productGroupRepository.save.mockImplementation(async g => g);
        await service.update('g1', 'ws1', { defaultRepurchaseDays: 30 });
        expect(group.link).toBe('https://a.vn');
        await service.update('g1', 'ws1', { link: null });
        expect(group.link).toBeNull();
    });
});
