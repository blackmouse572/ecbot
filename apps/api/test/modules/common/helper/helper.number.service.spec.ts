import { HelperNumberService } from '@app/common/helper/services/helper.number.service';

describe('HelperNumberService', () => {
    let service: HelperNumberService;

    beforeEach(() => {
        service = new HelperNumberService();
    });

    describe('randomInRange', () => {
        it('returns integers within [min, max) - min inclusive, max exclusive', () => {
            for (let i = 0; i < 200; i += 1) {
                const value = service.randomInRange(10, 20);

                expect(Number.isInteger(value)).toBe(true);
                expect(value).toBeGreaterThanOrEqual(10);
                expect(value).toBeLessThan(20);
            }
        });

        it('does not use Math.random (crypto-secure)', () => {
            const mathRandomSpy = jest.spyOn(Math, 'random');

            service.randomInRange(0, 100);

            expect(mathRandomSpy).not.toHaveBeenCalled();
            mathRandomSpy.mockRestore();
        });
    });

    describe('random(length)', () => {
        it('generates a 6-digit OTP-style number within [100000, 999999) for length 6', () => {
            for (let i = 0; i < 200; i += 1) {
                const value = service.random(6);

                expect(value).toBeGreaterThanOrEqual(100000);
                expect(value).toBeLessThan(999999);
                expect(String(value)).toHaveLength(6);
            }
        });

        it('does not use Math.random (crypto-secure)', () => {
            const mathRandomSpy = jest.spyOn(Math, 'random');

            service.random(6);

            expect(mathRandomSpy).not.toHaveBeenCalled();
            mathRandomSpy.mockRestore();
        });
    });
});
