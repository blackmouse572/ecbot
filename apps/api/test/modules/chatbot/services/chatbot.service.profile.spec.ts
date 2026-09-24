import { BadRequestException } from '@nestjs/common';
import { createProfile } from '@repo/agent-blueprint';
import { ChatbotService } from '../../../../src/modules/chatbot/services/chatbot.service';

describe('ChatbotService.resolvePromptFields', () => {
    const service = new ChatbotService({} as any, {} as any, {} as any);
    const profile = {
        ...createProfile('beauty', 'vi'),
        businessName: 'Lotus',
        agentName: 'Linh',
    };

    it('compiles generalKnowledge from a valid profile and appends extra instructions', () => {
        const out = service.resolvePromptFields({
            agentProfile: profile,
            extraInstructions: 'Closed on Mondays.',
        });
        expect(out.agentProfile).toEqual(profile);
        expect(out.generalKnowledge).toContain('# Linh · Lotus');
        expect(out.generalKnowledge).toContain(
            '## Extra instructions\nClosed on Mondays.'
        );
        expect(out.generalKnowledge).not.toContain('—');
    });

    it('rejects an invalid profile with a localized bad request', () => {
        expect(() =>
            service.resolvePromptFields({
                agentProfile: { ...profile, goals: ['hack'] },
            })
        ).toThrow(BadRequestException);
    });

    it('keeps a legacy prompt: extra instructions become generalKnowledge when there is no profile', () => {
        const legacy = 'Old hand-written prompt that must survive.';
        const out = service.resolvePromptFields({ extraInstructions: legacy });
        expect(out.generalKnowledge).toBe(legacy);
        expect(out.agentProfile).toBeUndefined();
    });

    it('passes generalKnowledge through untouched for old clients', () => {
        expect(
            service.resolvePromptFields({ generalKnowledge: 'raw' })
        ).toEqual({ generalKnowledge: 'raw' });
    });

    it('recompiles from the stored profile when only extra instructions change', () => {
        const out = service.resolvePromptFields(
            { extraInstructions: 'New note.' },
            { agentProfile: profile, extraInstructions: 'Old note.' }
        );
        expect(out).toEqual({
            extraInstructions: 'New note.',
            generalKnowledge: expect.stringContaining(
                '## Extra instructions\nNew note.'
            ),
        });
        expect(out.generalKnowledge).toContain('# Linh · Lotus');
    });

    it('leaves prompt fields alone on a partial update of a builder bot', () => {
        expect(
            service.resolvePromptFields(
                { generalKnowledge: 'raw edit' },
                { agentProfile: profile }
            )
        ).toEqual({});
    });

    it('keeps stored extra instructions when a new profile arrives without them', () => {
        const out = service.resolvePromptFields(
            { agentProfile: profile },
            { agentProfile: profile, extraInstructions: 'Keep me.' }
        );
        expect(out.generalKnowledge).toContain(
            '## Extra instructions\nKeep me.'
        );
    });
});

describe('ChatbotService.create', () => {
    it('invalidates the apps/ai cache after creating', async () => {
        const repo = {
            create: jest.fn(async (e: any) => ({
                ...e,
                id: 'c1',
                accounts: { add: jest.fn() },
            })),
        };
        const cache = { invalidate: jest.fn() };
        const service = new ChatbotService(
            { getReference: jest.fn() } as any,
            repo as any,
            cache as any
        );
        await service.create({
            name: 'b',
            type: 'beauty',
            primaryLanguage: 'vi',
            modelTextName: 'openai/gpt-5.4',
            workspace: 'w1',
        } as any);
        expect(cache.invalidate).toHaveBeenCalledWith('c1');
    });
});
