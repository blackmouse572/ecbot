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
