import { ENUM_ACCOUNT_TYPE } from '../../../src/modules/account/enums/account.enum';
import { AccountProvisionService } from '../../../src/modules/account/services/account-provision.service';

function makeService() {
    const created: any[] = [];
    const accountRepository = {
        create: jest.fn(async (data: any) => {
            const row = { id: `acc-${created.length + 1}`, ...data };
            created.push(row);
            return row;
        }),
        save: jest.fn(async (row: any) => row),
    };
    const em = { getReference: (_e: unknown, id: string) => ({ id }) };
    const helperString = {
        random: (n: number) => 'x'.repeat(n),
    };
    const helperEncryption = {
        envelopeEncrypt: (v: string) => `enc(${v})`,
        envelopeDecrypt: (v: string) => v.replace(/^enc\((.*)\)$/, '$1'),
    };

    const service = new AccountProvisionService(
        em as any,
        accountRepository as any,
        helperString as any,
        helperEncryption as any
    );

    return { service, accountRepository, created };
}

describe('AccountProvisionService.provisionApiChannel', () => {
    it('creates an API_CHANNEL account and returns the signing secret once', async () => {
        const { service, created } = makeService();

        const result = await service.provisionApiChannel({
            workspaceId: 'ws-1',
            name: 'Partner integration',
            callbackUrl: 'https://partner.example.com/hook',
            actionBy: 'user-1',
        });

        expect(result.accountKey).toEqual(expect.any(String));
        expect(result.signingSecret).toEqual(expect.any(String));
        expect(result.signingSecret.length).toBeGreaterThanOrEqual(32);

        const row = created[0];
        expect(row.type).toBe(ENUM_ACCOUNT_TYPE.API_CHANNEL);
        expect(row.externalId).toBe(result.accountKey);
        expect(row.config.callbackUrl).toBe('https://partner.example.com/hook');
    });

    it('never stores the signing secret in plaintext', async () => {
        const { service, created } = makeService();

        const result = await service.provisionApiChannel({
            workspaceId: 'ws-1',
            name: 'Partner',
            callbackUrl: 'https://partner.example.com/hook',
            actionBy: 'user-1',
        });

        expect(created[0].config.signingSecret).not.toBe(result.signingSecret);
        expect(created[0].config.signingSecret).toBe(
            `enc(${result.signingSecret})`
        );
    });

    it('fills the required accessToken column without giving it meaning', async () => {
        const { service, created } = makeService();

        await service.provisionApiChannel({
            workspaceId: 'ws-1',
            name: 'Partner',
            callbackUrl: 'https://partner.example.com/hook',
            actionBy: 'user-1',
        });

        // accessToken is NOT NULL and unused for eccho-issued channels.
        expect(created[0].accessToken).toEqual(expect.any(String));
        expect(created[0].accessToken.length).toBeGreaterThan(0);
    });
});

describe('AccountProvisionService.rotateApiChannelSecret', () => {
    it('issues a new secret without changing the account key or callback URL', async () => {
        const { service, accountRepository } = makeService();
        const account = {
            id: 'acc-1',
            externalId: 'key-abc',
            type: ENUM_ACCOUNT_TYPE.API_CHANNEL,
            config: {
                callbackUrl: 'https://partner.example.com/hook',
                signingSecret: 'enc(old-secret)',
            },
        } as any;

        const result = await service.rotateApiChannelSecret(
            account,
            'user-1'
        );

        expect(result.accountKey).toBe('key-abc');
        expect(result.signingSecret).not.toBe('old-secret');
        expect(account.config.callbackUrl).toBe(
            'https://partner.example.com/hook'
        );
        expect(account.config.signingSecret).toBe(
            `enc(${result.signingSecret})`
        );
        expect(accountRepository.save).toHaveBeenCalled();
    });

    it('refuses to rotate a non-API_CHANNEL account', async () => {
        const { service } = makeService();
        const account = {
            id: 'acc-1',
            type: ENUM_ACCOUNT_TYPE.TELEGRAM_BOT,
        } as any;

        await expect(
            service.rotateApiChannelSecret(account, 'user-1')
        ).rejects.toThrow();
    });
});

describe('AccountProvisionService.updateCallbackUrl', () => {
    it('replaces the callback URL without touching externalId or the secret', async () => {
        const { service, accountRepository } = makeService();
        const account = {
            id: 'acc-1',
            externalId: 'key-abc',
            type: ENUM_ACCOUNT_TYPE.API_CHANNEL,
            config: {
                callbackUrl: 'https://old.example.com/hook',
                signingSecret: 'enc(secret)',
            },
        } as any;

        await service.updateCallbackUrl(
            account,
            'https://new.example.com/hook',
            'user-1'
        );

        expect(account.config.callbackUrl).toBe(
            'https://new.example.com/hook'
        );
        expect(account.config.signingSecret).toBe('enc(secret)');
        expect(account.externalId).toBe('key-abc');
        expect(accountRepository.save).toHaveBeenCalled();
    });

    it('refuses to update a non-API_CHANNEL account', async () => {
        const { service } = makeService();
        const account = {
            id: 'acc-1',
            type: ENUM_ACCOUNT_TYPE.TELEGRAM_BOT,
        } as any;

        await expect(
            service.updateCallbackUrl(
                account,
                'https://new.example.com/hook',
                'user-1'
            )
        ).rejects.toThrow();
    });
});

describe('AccountProvisionService.updateAllowedOrigins', () => {
    it('replaces and normalises allowed origins without touching externalId', async () => {
        const { service, accountRepository } = makeService();
        const account = {
            id: 'acc-1',
            externalId: 'widget-key-abc',
            type: ENUM_ACCOUNT_TYPE.WEBSITE_WIDGET,
            config: { allowedOrigins: ['https://old.example.com'] },
        } as any;

        await service.updateAllowedOrigins(
            account,
            ['HTTPS://New.Example.com/path'],
            'user-1'
        );

        expect(account.config.allowedOrigins).toEqual([
            'https://new.example.com',
        ]);
        expect(account.externalId).toBe('widget-key-abc');
        expect(accountRepository.save).toHaveBeenCalled();
    });

    it('refuses to update a non-WEBSITE_WIDGET account', async () => {
        const { service } = makeService();
        const account = {
            id: 'acc-1',
            type: ENUM_ACCOUNT_TYPE.API_CHANNEL,
        } as any;

        await expect(
            service.updateAllowedOrigins(
                account,
                ['https://new.example.com'],
                'user-1'
            )
        ).rejects.toThrow();
    });
});

describe('AccountProvisionService.provisionWebsiteWidget', () => {
    it('creates a WEBSITE_WIDGET account whose key is public, not secret', async () => {
        const { service, created } = makeService();

        const result = await service.provisionWebsiteWidget({
            workspaceId: 'ws-1',
            name: 'Shop widget',
            allowedOrigins: ['https://shop.example.com'],
            actionBy: 'user-1',
        });

        expect(result.widgetKey).toEqual(expect.any(String));
        expect(created[0].type).toBe(ENUM_ACCOUNT_TYPE.WEBSITE_WIDGET);
        expect(created[0].externalId).toBe(result.widgetKey);
        expect(created[0].config.allowedOrigins).toEqual([
            'https://shop.example.com',
        ]);
        // No secret is minted — the widget key travels in public page source.
        expect(created[0].config.signingSecret).toBeUndefined();
    });

    it('normalises allowed origins to bare origins', async () => {
        const { service, created } = makeService();

        await service.provisionWebsiteWidget({
            workspaceId: 'ws-1',
            name: 'Shop widget',
            allowedOrigins: [
                'https://shop.example.com/checkout?a=1',
                'HTTPS://Shop.Example.com',
            ],
            actionBy: 'user-1',
        });

        expect(created[0].config.allowedOrigins).toEqual([
            'https://shop.example.com',
        ]);
    });
});
