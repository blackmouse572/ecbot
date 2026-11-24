import { Logger } from '@nestjs/common';
import { CustomerService } from '../../../src/modules/customer/services/customer.service';
import { CustomerLimit } from '../../../src/modules/customer/interfaces/customer-limit.interface';
import { ENUM_ACCOUNT_TYPE } from '../../../src/modules/account/enums/account.enum';

type Ctor = ConstructorParameters<typeof CustomerService>;

// A new sender dropped at the plan's customer limit is lost data. Prod logs at
// WARNING, so the drop has to surface there with the workspace id — see #605.
describe('CustomerService.resolveContactPoint at the customer limit', () => {
    let warn: jest.SpyInstance;
    let debug: jest.SpyInstance;

    beforeEach(() => {
        warn = jest.spyOn(Logger.prototype, 'warn').mockImplementation();
        debug = jest.spyOn(Logger.prototype, 'debug').mockImplementation();
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    function build(limit: number, count: number) {
        const customerRepository = {
            countByWorkspace: jest.fn().mockResolvedValue(count),
            create: jest.fn().mockResolvedValue({ id: 'cust-1' }),
        };

        const contactPointRepository = {
            findByWorkspacePlatformSender: jest.fn().mockResolvedValue(null),
            create: jest.fn().mockResolvedValue({ id: 'cp-1' }),
        };

        const customerLimit: CustomerLimit = {
            getCustomerLimit: jest.fn().mockResolvedValue(limit),
        };

        return new CustomerService(
            // SAFETY: resolveContactPoint reads only countByWorkspace/create.
            customerRepository as unknown as Ctor[0],
            // SAFETY: it reads only findByWorkspacePlatformSender/create.
            contactPointRepository as unknown as Ctor[1],
            // SAFETY: resolveContactPoint never touches ModuleRef.
            { get: jest.fn() } as unknown as Ctor[2],
            customerLimit
        );
    }

    function resolve(
        service: CustomerService,
        externalSenderId: string,
        workspaceId = 'ws-605'
    ) {
        return service.resolveContactPoint({
            workspaceId,
            platform: ENUM_ACCOUNT_TYPE.FACEBOOK_PAGE,
            externalSenderId,
        });
    }

    it('warns with the workspace and platform instead of hiding the drop at debug', async () => {
        const service = build(5, 5);

        const result = await resolve(service, 'sender-1');

        expect(result).toEqual({
            contactPoint: null,
            customerId: null,
            created: false,
        });
        expect(warn).toHaveBeenCalledTimes(1);

        const message = String(warn.mock.calls[0][0]);
        expect(message).toContain('ws-605');
        expect(message).toContain(ENUM_ACCOUNT_TYPE.FACEBOOK_PAGE);
        expect(message).not.toContain('sender-1');
        expect(debug).not.toHaveBeenCalledWith(
            expect.stringContaining('Customer limit reached')
        );
    });

    it('warns once per workspace per 10 minutes', async () => {
        const service = build(5, 5);
        const now = jest.spyOn(Date, 'now').mockReturnValue(1_000_000);

        await resolve(service, 'sender-1');
        await resolve(service, 'sender-2');
        expect(warn).toHaveBeenCalledTimes(1);

        await resolve(service, 'sender-1', 'ws-other');
        expect(warn).toHaveBeenCalledTimes(2);

        now.mockReturnValue(1_000_000 + 10 * 60_000);
        await resolve(service, 'sender-3');
        expect(warn).toHaveBeenCalledTimes(3);
    });

    it('stays quiet while the workspace is below its limit', async () => {
        const service = build(5, 4);

        const result = await resolve(service, 'sender-1');

        expect(result).toEqual({
            contactPoint: { id: 'cp-1' },
            customerId: 'cust-1',
            created: true,
        });
        expect(warn).not.toHaveBeenCalled();
    });
});
