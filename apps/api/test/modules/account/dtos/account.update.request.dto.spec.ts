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
    workspace: '0b9f3c2e-6a51-4c1f-9d0a-2f6c1e8b7a44',
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
        await expect(errorFields(BASE)).resolves.toEqual([]);
    });

    it.each([
        ['an empty', ''],
        ['a null', null],
    ])('still rejects %s token', async (_label, accessToken) => {
        // null would reach the NOT NULL column instead of failing validation.
        await expect(errorFields({ ...BASE, accessToken })).resolves.toEqual([
            'accessToken',
        ]);
    });
});
