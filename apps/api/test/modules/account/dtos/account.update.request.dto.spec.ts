import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { AccountUpdateRequestDto } from '../../../../src/modules/account/dtos/request/account.update.request.dto';
import { ENUM_ACCOUNT_TYPE } from '../../../../src/modules/account/enums/account.enum';

const BASE = {
    link: 'https://facebook.com/shop',
    name: 'Shop',
    type: ENUM_ACCOUNT_TYPE.FACEBOOK_PAGE,
    avatar: 'https://example.com/a.png',
    slug: 'shop',
};

async function errorFields(body: object): Promise<string[]> {
    const errors = await validate(
        plainToInstance(AccountUpdateRequestDto, body)
    );
    return errors.map(e => e.property);
}

describe('AccountUpdateRequestDto accessToken', () => {
    it('accepts an update without a token, so the stored one is kept', async () => {
        // The admin edit form leaves the token out unless a new one is typed,
        // and AccountService.update only overwrites it when it is present.
        await expect(errorFields(BASE)).resolves.not.toContain('accessToken');
    });

    it('still rejects an empty token', async () => {
        await expect(
            errorFields({ ...BASE, accessToken: '' })
        ).resolves.toContain('accessToken');
    });
});
