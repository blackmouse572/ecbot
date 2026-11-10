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
        updateRaw: jest.fn(),
        computeLearnedRepurchaseDays: jest.fn(),
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

    it('stores the learned cycle for each group, clearing it below 5 pairs', async () => {
        productGroupRepository.computeLearnedRepurchaseDays
            .mockResolvedValueOnce(38)
            .mockResolvedValueOnce(null);
        await service.refreshLearnedCycles(['g1', 'g2', 'g1']);
        expect(productGroupRepository.updateRaw).toHaveBeenCalledTimes(2);
        expect(productGroupRepository.updateRaw).toHaveBeenCalledWith(
            { id: 'g1' },
            { learnedRepurchaseDays: 38 }
        );
        expect(productGroupRepository.updateRaw).toHaveBeenCalledWith(
            { id: 'g2' },
            { learnedRepurchaseDays: null }
        );
    });
});
