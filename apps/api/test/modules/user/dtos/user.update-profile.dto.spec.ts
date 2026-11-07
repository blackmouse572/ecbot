import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { UserUpdateProfileRequestDto } from 'src/modules/user/dtos/request/user.update-profile.dto';

// Sign-up never asks for gender, so a profile edit that sends only name and
// country must pass validation.
describe('UserUpdateProfileRequestDto', () => {
    const build = (body: Record<string, unknown>) =>
        plainToInstance(UserUpdateProfileRequestDto, body);

    it('accepts name and country without gender', async () => {
        const errors = await validate(
            build({
                name: 'Lan Nguyen',
                country: '6c178210-85e5-4b5f-b63b-615f959c70a8',
            })
        );

        expect(errors).toEqual([]);
    });

    it('still rejects an unknown gender value', async () => {
        const errors = await validate(
            build({
                name: 'Lan Nguyen',
                country: '6c178210-85e5-4b5f-b63b-615f959c70a8',
                gender: 'OTHER',
            })
        );

        expect(errors.map(e => e.property)).toEqual(['gender']);
    });
});
