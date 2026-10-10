import { plainToInstance } from 'class-transformer';
import { useContainer, validate } from 'class-validator';
import { HelperStringService } from 'src/common/helper/services/helper.string.service';
import { AuthSignUpRequestDto } from 'src/modules/auth/dtos/request/auth.sign-up.request.dto';

// Consent record (GDPR Art 7, Decree 13/2023 Art 11): sign-up must carry an
// explicit acceptance of the Terms of Service and Privacy Policy.
describe('AuthSignUpRequestDto - acceptTerms', () => {
    beforeAll(() => {
        // The email and password constraints are Nest-injected; give them
        // the real HelperStringService outside the Nest container.
        useContainer({
            get: (constraint: new (...args: unknown[]) => unknown) =>
                new constraint(new HelperStringService(), {}),
        });
    });

    const validateWith = (acceptTerms: unknown) =>
        validate(
            plainToInstance(AuthSignUpRequestDto, {
                email: 'new@user.com',
                name: 'New User',
                password: 'Passw0rd!',
                country: '6c178210-85e5-4b5f-b63b-615f959c70a8',
                acceptTerms,
            })
        );

    it.each([
        ['missing', undefined],
        ['false', false],
        ['the string "true"', 'true'],
    ])('rejects acceptTerms when %s', async (_label, acceptTerms) => {
        const errors = await validateWith(acceptTerms);

        expect(errors).toHaveLength(1);
        expect(errors[0].property).toBe('acceptTerms');
        expect(errors[0].constraints).toHaveProperty('isTermsAccepted');
    });

    it('accepts acceptTerms: true', async () => {
        const errors = await validateWith(true);

        expect(errors).toEqual([]);
    });
});
