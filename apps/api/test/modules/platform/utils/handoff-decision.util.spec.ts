import { shouldHandOff } from '@app/modules/platform/utils/handoff-decision.util';

// One rule for every channel (#233 review): the widget and the platform
// pipeline used to carry their own copies.
describe('shouldHandOff', () => {
    const wantsPerson = jest.fn();

    beforeEach(() => wantsPerson.mockReset());

    it('does not hand off without a keyword', async () => {
        await expect(shouldHandOff(null, 'hi', wantsPerson)).resolves.toBe(
            false
        );
        expect(wantsPerson).not.toHaveBeenCalled();
    });

    it("always hands off on the owner's own keyword", async () => {
        await expect(
            shouldHandOff(
                { keyword: 'refund', source: 'custom' },
                'refund pls',
                wantsPerson
            )
        ).resolves.toBe(true);
        expect(wantsPerson).not.toHaveBeenCalled();
    });

    it('asks the intent check about a default keyword', async () => {
        wantsPerson.mockResolvedValue(false);

        await expect(
            shouldHandOff(
                { keyword: 'support', source: 'default' },
                'do you support COD?',
                wantsPerson
            )
        ).resolves.toBe(false);
        expect(wantsPerson).toHaveBeenCalledWith(
            'do you support COD?',
            'support'
        );
    });
});
