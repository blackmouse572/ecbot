import { ParseUUIDPipe } from '@nestjs/common';
import { ROUTE_ARGS_METADATA } from '@nestjs/common/constants';
import { ToolAdminController } from 'src/modules/tool/controllers/tool.admin.controller';
import { ENUM_TOOL_STATUS } from 'src/modules/tool/enums/tool-status.enum';

describe('ToolAdminController', () => {
    const tool = {
        id: 't-1',
        slug: 'orders',
        status: ENUM_TOOL_STATUS.REVOKED,
    };
    const toolService: any = { inactivate: jest.fn() };
    const activityService: any = { createByUser: jest.fn() };
    const controller = new ToolAdminController(
        toolService,
        {} as any,
        activityService
    );

    beforeEach(() => jest.clearAllMocks());

    it('logs an inactivation', async () => {
        toolService.inactivate.mockResolvedValue({ tool, changed: true });
        const res = await controller.inactivate({} as any, 't-1');
        expect(res).toEqual({ data: { id: 't-1' } });
        expect(activityService.createByUser).toHaveBeenCalledTimes(1);
    });

    // #253 review: turning off a tool that is already off changes nothing.
    it('writes no activity entry when the tool was already off', async () => {
        toolService.inactivate.mockResolvedValue({ tool, changed: false });
        const res = await controller.inactivate({} as any, 't-1');
        expect(res).toEqual({ data: { id: 't-1' } });
        expect(activityService.createByUser).not.toHaveBeenCalled();
    });

    // A malformed id would otherwise reach Postgres and come back as a 500.
    it.each(['get', 'activate', 'inactivate', 'delete'] as const)(
        '%s takes only a UUID as the tool id',
        handlerName => {
            const args = Reflect.getMetadata(
                ROUTE_ARGS_METADATA,
                ToolAdminController,
                handlerName
            );
            const param: any = Object.values(args).find(
                (arg: any) => arg.data === 'toolId'
            );
            expect(param.pipes).toContain(ParseUUIDPipe);
        }
    );
});
