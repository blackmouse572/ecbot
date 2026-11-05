import { NotFoundException } from '@nestjs/common';
import { GUARDS_METADATA, PATH_METADATA } from '@nestjs/common/constants';
import { AccountClientController } from '../../../../src/modules/account/controllers/account.client.controller';
import { ENUM_ACCOUNT_TYPE } from '../../../../src/modules/account/enums/account.enum';
import { ClientCredentialGuard } from '../../../../src/modules/client-credential/guards/client-credential.guard';
import { ClientCredentialPolicyGuard } from '../../../../src/modules/client-credential/guards/client-credential.policy.guard';
import { CLIENT_CREDENTIAL_POLICY_ABILITY_META_KEY } from '../../../../src/modules/client-credential/constants/client-credential.constant';
import {
    ENUM_POLICY_ACTION,
    ENUM_POLICY_SUBJECT,
} from '../../../../src/modules/policy/enums/policy.enum';

// Channels on the /client surface, for the Ecbot MCP Server. Same abilities
// and services as the app's account routes; the workspace and the acting
// member come from the client credential.
describe('AccountClientController', () => {
    const workspace = { id: 'ws1', slug: 'shop' } as never;
    const credential = { id: 'cred1', createdBy: { id: 'user1' } } as never;

    const accountService = {
        findAll: jest.fn(),
        getTotal: jest.fn(),
        findOneByIdOrSlug: jest.fn(),
        mapList: jest.fn((rows: unknown[]) => rows),
        mapDetail: jest.fn((row: unknown) => row),
        syncAccount: jest.fn(),
    };
    const provisionService = {
        provisionApiChannel: jest.fn(),
        provisionWebsiteWidget: jest.fn(),
    };
    const activityService = { createByUserWithWorkspace: jest.fn() };
    const paginationService = {
        totalPage: jest.fn((total: number, limit: number) =>
            Math.ceil(total / limit)
        ),
    };
    const configService = { get: jest.fn(() => 'https://app.ecbot.dev/') };
    let controller: AccountClientController;

    beforeEach(() => {
        jest.clearAllMocks();
        controller = new AccountClientController(
            accountService as never,
            provisionService as never,
            activityService as never,
            paginationService as never,
            configService as never
        );
    });

    const abilityOf = (handler: keyof AccountClientController) =>
        Reflect.getMetadata(
            CLIENT_CREDENTIAL_POLICY_ABILITY_META_KEY,
            AccountClientController.prototype[handler]
        );

    it('is mounted at /accounts', () => {
        expect(
            Reflect.getMetadata(PATH_METADATA, AccountClientController)
        ).toBe('/accounts');
    });

    it.each([
        ['list', ENUM_POLICY_ACTION.READ],
        ['get', ENUM_POLICY_ACTION.READ],
        ['createApiChannel', ENUM_POLICY_ACTION.CREATE],
        ['createWebsiteWidget', ENUM_POLICY_ACTION.CREATE],
        ['connectTelegram', ENUM_POLICY_ACTION.CREATE],
        ['connectLink', ENUM_POLICY_ACTION.CREATE],
    ] as const)('%s needs account %s, as in the app', (handler, action) => {
        expect(
            Reflect.getMetadata(
                GUARDS_METADATA,
                AccountClientController.prototype[handler]
            )
        ).toEqual([ClientCredentialGuard, ClientCredentialPolicyGuard]);
        expect(abilityOf(handler)).toEqual([
            { subject: ENUM_POLICY_SUBJECT.ACCOUNT, action: [action] },
        ]);
    });

    it('lists only the credential workspace, without deleted rows', async () => {
        accountService.findAll.mockResolvedValue([{ id: 'a1' }]);
        accountService.getTotal.mockResolvedValue(1);

        const result = await controller.list(
            workspace,
            { _limit: 20, _offset: 0, _order: {}, _search: {} } as never,
            {
                type: ENUM_ACCOUNT_TYPE.TELEGRAM_BOT,
                workspace: 'ws-other',
            } as never
        );

        expect(accountService.findAll).toHaveBeenCalledWith(
            {
                type: ENUM_ACCOUNT_TYPE.TELEGRAM_BOT,
                workspace: 'ws1',
                deletedAt: null,
            },
            expect.objectContaining({ populate: ['chatbot'] })
        );
        expect(result).toEqual({
            _pagination: { total: 1, totalPage: 1 },
            data: [{ id: 'a1' }],
        });
    });

    it('404s an account from another workspace', async () => {
        accountService.findOneByIdOrSlug.mockResolvedValue(null);

        await expect(controller.get(workspace, 'a9')).rejects.toBeInstanceOf(
            NotFoundException
        );
        expect(accountService.findOneByIdOrSlug).toHaveBeenCalledWith(
            'a9',
            expect.anything(),
            'ws1'
        );
    });

    it('creates an API channel as the key creator and logs it', async () => {
        provisionService.provisionApiChannel.mockResolvedValue({
            account: { id: 'a1' },
            accountKey: 'ak',
            signingSecret: 'ss',
        });
        const body = { name: 'CRM', callbackUrl: 'https://crm.example/hook' };

        const result = await controller.createApiChannel(
            workspace,
            credential,
            body
        );

        expect(provisionService.provisionApiChannel).toHaveBeenCalledWith({
            workspaceId: 'ws1',
            name: 'CRM',
            callbackUrl: 'https://crm.example/hook',
            actionBy: 'user1',
        });
        expect(result.data).toEqual({
            id: 'a1',
            accountKey: 'ak',
            signingSecret: 'ss',
            callbackUrl: 'https://crm.example/hook',
        });
        expect(activityService.createByUserWithWorkspace).toHaveBeenCalledWith(
            { id: 'user1' },
            workspace,
            expect.objectContaining({ subject: ENUM_POLICY_SUBJECT.ACCOUNT })
        );
    });

    it('creates a website widget as the key creator', async () => {
        provisionService.provisionWebsiteWidget.mockResolvedValue({
            account: {
                id: 'a2',
                config: { allowedOrigins: ['https://shop.example'] },
            },
            widgetKey: 'wk',
        });

        const result = await controller.createWebsiteWidget(
            workspace,
            credential,
            { name: 'Shop', allowedOrigins: ['https://shop.example'] }
        );

        expect(provisionService.provisionWebsiteWidget).toHaveBeenCalledWith(
            expect.objectContaining({ workspaceId: 'ws1', actionBy: 'user1' })
        );
        expect(result.data).toEqual({
            id: 'a2',
            widgetKey: 'wk',
            allowedOrigins: ['https://shop.example'],
        });
    });

    it('connects a Telegram bot from its token, as the app does', async () => {
        accountService.syncAccount.mockResolvedValue({
            id: 'a3',
            name: 'Shop bot',
            type: ENUM_ACCOUNT_TYPE.TELEGRAM_BOT,
            status: 'ACTIVE',
            link: 'https://t.me/shop_bot',
        });

        const result = await controller.connectTelegram(workspace, credential, {
            botToken: ' 123:abc ',
        });

        expect(accountService.syncAccount).toHaveBeenCalledWith(
            '123:abc',
            ENUM_ACCOUNT_TYPE.TELEGRAM_BOT,
            'ws1',
            'user1',
            'user1'
        );
        expect(result.data).toEqual({
            id: 'a3',
            name: 'Shop bot',
            type: ENUM_ACCOUNT_TYPE.TELEGRAM_BOT,
            status: 'ACTIVE',
            link: 'https://t.me/shop_bot',
        });
    });

    // Facebook, Zalo and the others need the person to sign in on the
    // platform in a browser, so the agent hands them the app's connect page.
    it('links to the app connect page with the platform picked', async () => {
        const result = await controller.connectLink(workspace, {
            platform: ENUM_ACCOUNT_TYPE.FACEBOOK_ACCOUNT,
        });

        expect(configService.get).toHaveBeenCalledWith('home.url');
        expect(result.data).toEqual({
            url: 'https://app.ecbot.dev/shop/accounts/create?platform=FACEBOOK_ACCOUNT',
        });
    });
});
