import {
    BadRequestException,
    ConflictException,
    NotFoundException,
} from '@nestjs/common';
import { ENUM_CUSTOMER_JOURNEY_STAGE as S } from 'src/modules/customer/enums/customer-marketing.enum';
import {
    ENUM_MARKETING_AUDIENCE_FIELD as F,
    ENUM_MARKETING_AUDIENCE_MATCH as M,
    ENUM_MARKETING_AUDIENCE_OPERATOR as O,
} from 'src/modules/marketing/enums/marketing-audience.enum';
import { ENUM_MARKETING_TODO as T } from 'src/modules/marketing/enums/marketing-overview.enum';
import { MarketingAudienceService } from 'src/modules/marketing/services/marketing-audience.service';
import { MarketingSavedAudienceService } from 'src/modules/marketing/services/marketing-saved-audience.service';

describe('MarketingSavedAudienceService', () => {
    const repository = {
        find: jest.fn(),
        findOne: jest.fn(),
        exists: jest.fn(),
        create: jest.fn(),
        save: jest.fn(),
        delete: jest.fn(),
    };
    // The real checks, so a saved audience is held to the preview's rules.
    const audiences = new MarketingAudienceService({} as any);
    const service = new MarketingSavedAudienceService(
        repository as any,
        audiences
    );
    const stage = { field: F.STAGE, operator: O.IN, values: [S.NEW] };

    beforeEach(() => {
        jest.resetAllMocks();
        repository.exists.mockResolvedValue(false);
        repository.create.mockImplementation(async data => data);
        repository.save.mockImplementation(async entity => entity);
    });

    it('saves conditions as plain data, matching all by default', async () => {
        await service.create('ws1', {
            name: 'Mới biết',
            conditions: [{ ...stage, extra: 'x' } as any],
        });
        expect(repository.create).toHaveBeenCalledWith({
            workspace: 'ws1',
            name: 'Mới biết',
            preset: null,
            match: M.ALL,
            conditions: [
                {
                    field: F.STAGE,
                    operator: O.IN,
                    values: [S.NEW],
                    number: undefined,
                },
            ],
        });
    });

    it('holds a saved audience to the preview rules', async () => {
        await expect(
            service.create('ws1', {
                name: 'x',
                conditions: [
                    { field: F.STAGE, operator: O.AT_LEAST, number: 1 },
                ],
            })
        ).rejects.toBeInstanceOf(BadRequestException);
        await expect(
            service.create('ws1', { name: 'x' })
        ).rejects.toBeInstanceOf(BadRequestException);
        expect(repository.create).not.toHaveBeenCalled();
    });

    it('refuses a name already used in the workspace', async () => {
        repository.exists.mockResolvedValue(true);
        await expect(
            service.create('ws1', { name: 'Hỏi giá', preset: T.ASKED_PRICE })
        ).rejects.toBeInstanceOf(ConflictException);
    });

    it('replaces conditions with a preset, clearing them', async () => {
        repository.findOne.mockResolvedValue({
            id: 'a1',
            name: 'x',
            match: M.ANY,
            conditions: [stage],
        });
        const saved = await service.update('a1', 'ws1', {
            preset: T.REPURCHASE,
        });
        expect(saved).toMatchObject({
            preset: T.REPURCHASE,
            match: null,
            conditions: null,
        });
    });

    it('renames, or changes how conditions match, without touching the rest', async () => {
        repository.findOne.mockResolvedValue({
            id: 'a1',
            name: 'x',
            match: M.ALL,
            conditions: [stage],
        });
        const saved = await service.update('a1', 'ws1', {
            name: 'y',
            match: M.ANY,
        });
        expect(saved).toMatchObject({
            name: 'y',
            match: M.ANY,
            conditions: [stage],
        });
        expect(repository.exists).toHaveBeenCalledWith(
            { workspace: 'ws1', name: 'y' },
            { excludeId: 'a1' }
        );
    });

    it('404s an audience outside the workspace', async () => {
        repository.findOne.mockResolvedValue(null);
        await expect(service.delete('a1', 'ws2')).rejects.toBeInstanceOf(
            NotFoundException
        );
        expect(repository.findOne).toHaveBeenCalledWith(
            { id: 'a1', workspace: 'ws2' },
            { populate: [] }
        );
        expect(repository.delete).not.toHaveBeenCalled();
    });
});
