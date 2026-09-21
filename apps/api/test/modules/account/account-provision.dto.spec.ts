import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { AccountProvisionApiChannelRequestDto } from '../../../src/modules/account/dtos/request/account.provision-api-channel.request.dto';

async function errorsFor(callbackUrl: string): Promise<string[]> {
    const dto = plainToInstance(AccountProvisionApiChannelRequestDto, {
        name: 'Partner CRM',
        callbackUrl,
    });
    const errors = await validate(dto);
    return errors.flatMap(e => Object.keys(e.constraints ?? {}));
}

describe('AccountProvisionApiChannelRequestDto callbackUrl', () => {
    it('accepts a public HTTPS endpoint', async () => {
        await expect(
            errorsFor('https://partner.example.com/eccho/replies')
        ).resolves.toEqual([]);
    });

    it('accepts an HTTPS localhost endpoint with a port', async () => {
        // `localhost` has no TLD, and validator.js requires one by default —
        // which made every local integration attempt fail validation.
        await expect(errorsFor('https://localhost:5173/hook')).resolves.toEqual(
            []
        );
    });

    it('accepts an HTTPS internal hostname', async () => {
        await expect(
            errorsFor('https://partner-api:8443/hook')
        ).resolves.toEqual([]);
    });

    it('rejects a plaintext endpoint', async () => {
        // The callback carries conversation content and the signature is
        // worthless over a channel anyone can read or rewrite.
        await expect(errorsFor('http://partner.example.com/hook')).resolves.toEqual(
            ['isUrl']
        );
    });

    it('rejects a bare host with no scheme', async () => {
        await expect(errorsFor('partner.example.com/hook')).resolves.toEqual([
            'isUrl',
        ]);
    });

    it('rejects a non-URL', async () => {
        await expect(errorsFor('not a url')).resolves.toEqual(['isUrl']);
    });
});
