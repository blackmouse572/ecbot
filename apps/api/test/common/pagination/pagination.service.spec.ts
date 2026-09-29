import { PaginationService } from '@app/common/pagination/services/pagination.service';

describe('PaginationService.search', () => {
    const service = new PaginationService();

    it('matches every searchable field regardless of case', () => {
        const { $or } = service.search('lotus', ['name', 'slug']);

        expect($or).toHaveLength(2);
        expect($or[0].name.test('Lotus Spa')).toBe(true);
        expect($or[1].slug.test('LOTUS-spa')).toBe(true);
    });

    it('adds no filter for an empty search', () => {
        expect(service.search('', ['name'])).toBeUndefined();
    });
});
