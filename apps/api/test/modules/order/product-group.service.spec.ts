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
});
