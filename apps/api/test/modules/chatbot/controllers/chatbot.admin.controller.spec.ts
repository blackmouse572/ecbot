import { API_KEY_X_TYPE_META_KEY } from '@app/modules/api-key/constants/api-key.constant';
import { ENUM_API_KEY_TYPE } from '@app/modules/api-key/enums/api-key.enum';
import { NotFoundException, ParseUUIDPipe } from '@nestjs/common';
import { ROUTE_ARGS_METADATA } from '@nestjs/common/constants';
import { ChatbotAdminController } from 'src/modules/chatbot/controllers/chatbot.admin.controller';

describe('ChatbotAdminController', () => {
    const chatbot = { id: 'c-1', name: 'Shop bot' };
    const chatbotService: any = {
        findAll: jest.fn(),
        getTotal: jest.fn(),
        findOne: jest.fn(),
        update: jest.fn(),
        softDelete: jest.fn(),
        mapDetails: jest.fn((c: any) => ({ id: c.id, name: c.name })),
    };
    const paginationService: any = { totalPage: jest.fn(() => 1) };
    const activityService: any = { createByUser: jest.fn() };
    const controller = new ChatbotAdminController(
        chatbotService,
        paginationService,
        activityService
    );

    beforeEach(() => jest.clearAllMocks());

    const handlers = ['findAll', 'findOne', 'update', 'delete'] as const;

    // The admin portal calls with the DEFAULT key like every other admin
    // route; a SYSTEM-only guard answered it with 403.
    it.each(handlers)('%s accepts the default api key', handlerName => {
        const types = Reflect.getMetadata(
            API_KEY_X_TYPE_META_KEY,
            ChatbotAdminController.prototype[handlerName]
        );
        expect(types).toEqual([ENUM_API_KEY_TYPE.DEFAULT]);
    });

    // A malformed id would otherwise reach Postgres and come back as a 500.
    it.each(['findOne', 'update', 'delete'] as const)(
        '%s takes only a UUID as the chatbot id',
        handlerName => {
            const args = Reflect.getMetadata(
                ROUTE_ARGS_METADATA,
                ChatbotAdminController,
                handlerName
            );
            const param: any = Object.values(args).find(
                (arg: any) => arg.data === 'id'
            );
            expect(param.pipes).toContain(ParseUUIDPipe);
        }
    );

    it('lists with the filters and populates the real relations', async () => {
        chatbotService.findAll.mockResolvedValue([chatbot]);
        chatbotService.getTotal.mockResolvedValue(1);

        const res = await controller.findAll(
            {
                _search: {},
                _limit: 20,
                _offset: 0,
                _order: { createdAt: 'desc' },
            } as any,
            { status: { $in: ['active'] } },
            { type: { $in: ['spa'] } },
            { workspace: 'w-1' }
        );

        expect(chatbotService.findAll).toHaveBeenCalledWith(
            {
                deletedAt: null,
                status: { $in: ['active'] },
                type: { $in: ['spa'] },
                workspace: 'w-1',
            },
            expect.objectContaining({
                populate: ['workspace', 'accounts'],
            })
        );
        expect(res).toEqual({
            _pagination: { total: 1, totalPage: 1 },
            data: [{ id: 'c-1', name: 'Shop bot' }],
        });
    });

    it('answers 404 for a chatbot that does not exist', async () => {
        chatbotService.findOne.mockResolvedValue(null);
        await expect(controller.findOne('c-404')).rejects.toBeInstanceOf(
            NotFoundException
        );
        await expect(
            controller.update('c-404', {} as any, {} as any)
        ).rejects.toBeInstanceOf(NotFoundException);
        await expect(
            controller.delete('c-404', {} as any)
        ).rejects.toBeInstanceOf(NotFoundException);
        expect(chatbotService.update).not.toHaveBeenCalled();
        expect(chatbotService.softDelete).not.toHaveBeenCalled();
    });

    it('returns the mapped detail with workspace and accounts', async () => {
        chatbotService.findOne.mockResolvedValue(chatbot);
        const res = await controller.findOne('c-1');
        expect(chatbotService.findOne).toHaveBeenCalledWith(
            { id: 'c-1', deletedAt: null },
            { populate: ['workspace', 'accounts'] }
        );
        expect(res).toEqual({ data: { id: 'c-1', name: 'Shop bot' } });
    });
});
