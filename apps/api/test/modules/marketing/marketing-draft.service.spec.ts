import {
    BadRequestException,
    ServiceUnavailableException,
    UnprocessableEntityException,
} from '@nestjs/common';
import { ENUM_AI_USAGE_SOURCE } from 'src/app/ai-usage-meter.interface';
import { ENUM_MARKETING_TODO } from 'src/modules/marketing/enums/marketing-overview.enum';
import { MarketingDraftService } from 'src/modules/marketing/services/marketing-draft.service';

const USAGE = { promptTokens: 120, completionTokens: 40, totalTokens: 160 };

function makeService(
    text: string,
    budget: { allowed: boolean; reason?: string } = { allowed: true }
) {
    const ai = {
        write: jest.fn(async () => ({ text, usage: USAGE, model: 'm1' })),
    };
    const meter = {
        check: jest.fn(async () => budget),
        record: jest.fn(async () => undefined),
    };
    const audience = {
        toAudience: jest.fn(
            (dto: { preset?: string; conditions?: unknown[] }) => {
                if (dto.preset) return { preset: dto.preset };
                if (!dto.conditions?.length) {
                    throw new BadRequestException(
                        'marketingAudience.error.presetOrConditions'
                    );
                }
                return { match: 'ALL', conditions: dto.conditions };
            }
        ),
    };
    return {
        service: new MarketingDraftService(
            ai as any,
            audience as any,
            meter as any
        ),
        ai,
        meter,
    };
}

describe('MarketingDraftService', () => {
    it('asks for a message for the stage, with the shop and the offer, and meters it', async () => {
        const { service, ai, meter } = makeService(
            'Chào {name}, {product} bạn hỏi đang giảm 10% đến 20/11 nha.'
        );
        const draft = await service.draft('ws1', 'Lumi Skincare', {
            preset: ENUM_MARKETING_TODO.ASKED_PRICE,
            offer: 'Giảm 10% đến 20/11',
        });

        expect(draft).toEqual({
            text: 'Chào {name}, {product} bạn hỏi đang giảm 10% đến 20/11 nha.',
        });
        const [instructions, state] = ai.write.mock.calls[0] as unknown as [
            string,
            string,
        ];
        expect(instructions).toContain('Vietnamese');
        expect(instructions).toContain('asked the price');
        expect(instructions).toContain('{name}');
        expect(state).toContain('Lumi Skincare');
        expect(state).toContain('Giảm 10% đến 20/11');
        expect(meter.check).toHaveBeenCalledWith('ws1');
        expect(meter.record).toHaveBeenCalledWith({
            workspaceId: 'ws1',
            usage: USAGE,
            source: ENUM_AI_USAGE_SOURCE.MARKETING_DRAFT,
            model: 'm1',
        });
    });

    it('asks for a different text than the last one, in the language asked', async () => {
        const { service, ai } = makeService('Hi {name}, we miss you.');
        await service.draft('ws1', 'Lumi', {
            conditions: [
                { field: 'CHANNEL', operator: 'IN', values: ['ZALO_PAGE'] },
            ] as any,
            previous: 'Hi {name}, come back soon.',
            language: 'en',
        });
        const [instructions, state] = ai.write.mock.calls[0] as unknown as [
            string,
            string,
        ];
        expect(instructions).toContain('English');
        expect(instructions).toContain('Hi {name}, come back soon.');
        expect(state).toContain('Offer: none');
    });

    it('checks the audience as a send does, before spending tokens', async () => {
        const { service, ai, meter } = makeService('x');
        await expect(service.draft('ws1', 'Lumi', {})).rejects.toBeInstanceOf(
            BadRequestException
        );
        expect(meter.check).not.toHaveBeenCalled();
        expect(ai.write).not.toHaveBeenCalled();
    });

    it('replaces dashes with commas', async () => {
        const { service } = makeService('Chào {name} — Lumi có quà – cho bạn');
        await expect(
            service.draft('ws1', 'Lumi', {
                preset: ENUM_MARKETING_TODO.WIN_BACK,
            })
        ).resolves.toEqual({ text: 'Chào {name}, Lumi có quà, cho bạn' });
    });

    it('refuses when the workspace is out of tokens, without calling the model', async () => {
        const { service, ai } = makeService('x', {
            allowed: false,
            reason: 'monthly',
        });
        await expect(
            service.draft('ws1', 'Lumi', { preset: ENUM_MARKETING_TODO.NEW })
        ).rejects.toBeInstanceOf(UnprocessableEntityException);
        expect(ai.write).not.toHaveBeenCalled();
    });

    it('says the draft failed when the model wrote nothing', async () => {
        const { service } = makeService('  ');
        await expect(
            service.draft('ws1', 'Lumi', { preset: ENUM_MARKETING_TODO.NEW })
        ).rejects.toBeInstanceOf(ServiceUnavailableException);
    });

    it('says the draft failed when apps/ai cannot be reached', async () => {
        const { service, ai } = makeService('x');
        ai.write.mockRejectedValueOnce(new Error('ECONNREFUSED'));
        await expect(
            service.draft('ws1', 'Lumi', { preset: ENUM_MARKETING_TODO.NEW })
        ).rejects.toBeInstanceOf(ServiceUnavailableException);
    });
});
