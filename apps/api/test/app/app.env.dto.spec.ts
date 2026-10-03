import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { AppEnvDto } from 'src/app/dtos/app.env.dto';

describe('AppEnvDto — API_INTERNAL_TOKEN', () => {
    const errorsFor = async (env: Record<string, string>) =>
        (await validate(plainToInstance(AppEnvDto, env))).filter(
            e => e.property === 'API_INTERNAL_TOKEN'
        );

    it('rejects a missing token', async () => {
        expect(await errorsFor({})).toHaveLength(1);
    });

    it('rejects an empty token', async () => {
        expect(await errorsFor({ API_INTERNAL_TOKEN: '' })).toHaveLength(1);
    });

    it('accepts a non-empty token', async () => {
        expect(
            await errorsFor({ API_INTERNAL_TOKEN: 'dev-internal-token' })
        ).toHaveLength(0);
    });
});

// .env.example ships EMAIL_SUPPORT= empty, and an empty value means "no
// support line in emails", so only a set value has to be an address.
describe('AppEnvDto — EMAIL_SUPPORT', () => {
    const errorsFor = async (env: Record<string, string>) =>
        (await validate(plainToInstance(AppEnvDto, env))).filter(
            e => e.property === 'EMAIL_SUPPORT'
        );

    it('accepts it unset or empty', async () => {
        expect(await errorsFor({})).toHaveLength(0);
        expect(await errorsFor({ EMAIL_SUPPORT: '' })).toHaveLength(0);
    });

    it('accepts an email address', async () => {
        expect(
            await errorsFor({ EMAIL_SUPPORT: 'help@ecbot.dev' })
        ).toHaveLength(0);
    });

    it('rejects a value that is not an email address', async () => {
        expect(await errorsFor({ EMAIL_SUPPORT: 'help' })).toHaveLength(1);
    });
});
