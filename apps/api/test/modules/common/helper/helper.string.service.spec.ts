import { HelperStringService } from '@app/common/helper/services/helper.string.service';

describe('HelperStringService', () => {
    let service: HelperStringService;

    beforeEach(() => {
        service = new HelperStringService();
    });

    describe('random', () => {
        it('returns a string of exactly the requested length', () => {
            expect(service.random(16)).toHaveLength(16);
            expect(service.random(1)).toHaveLength(1);
            expect(service.random(0)).toHaveLength(0);
        });

        it('only uses characters from the alphanumeric charset', () => {
            const result = service.random(500);
            expect(result).toMatch(/^[A-Za-z0-9]*$/);
        });

        it('does not use Math.random (crypto-secure)', () => {
            const mathRandomSpy = jest.spyOn(Math, 'random');

            service.random(32);

            expect(mathRandomSpy).not.toHaveBeenCalled();
            mathRandomSpy.mockRestore();
        });

        it('produces varying output across calls, not a fixed sequence', () => {
            const results = new Set(
                Array.from({ length: 20 }, () => service.random(20))
            );

            expect(results.size).toBeGreaterThan(1);
        });
    });

    describe('randomReference', () => {
        it('prefixes the random string with an uppercased timestamp of the requested length', () => {
            const ref = service.randomReference(8);
            const timestampLength = String(new Date().getTime()).length;

            expect(ref).toHaveLength(timestampLength + 8);
            expect(ref).toBe(ref.toUpperCase());
        });
    });
});
