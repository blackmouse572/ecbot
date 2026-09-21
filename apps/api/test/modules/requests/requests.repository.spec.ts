import { EntityManager } from '@mikro-orm/postgresql';
import { Test } from '@nestjs/testing';
import { RequestRepository } from '../../../src/modules/requests/repository/repositories/requests.repository';

describe('RequestRepository DI wiring', () => {
    // Regression: repository had no explicit constructor, so Nest emitted no
    // design:paramtypes metadata and instantiated it with zero args, leaving
    // `this.em` undefined (repro of "Cannot read properties of undefined
    // (reading 'find')").
    it('receives the injected EntityManager so find() works', async () => {
        const em = { find: jest.fn().mockResolvedValue([]) } as unknown as EntityManager;

        const moduleRef = await Test.createTestingModule({
            providers: [
                RequestRepository,
                { provide: EntityManager, useValue: em },
            ],
        }).compile();

        const repo = moduleRef.get(RequestRepository);

        await expect(repo.find({}, {})).resolves.toEqual([]);
        expect(em.find).toHaveBeenCalled();
    });
});
