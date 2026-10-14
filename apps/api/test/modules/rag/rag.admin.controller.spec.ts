import { RAGAdminController } from '@app/modules/rag/controllers/rag.admin.controller';

describe('RAGAdminController list', () => {
    const ragService = {
        findAllWithJoined: jest.fn().mockResolvedValue([{ id: 'r1' }]),
        getTotal: jest.fn().mockResolvedValue(1),
        mapGet: jest.fn((rag: any) => rag),
    };
    const controller = new RAGAdminController(
        ragService as any,
        {} as any,
        { totalPage: jest.fn().mockReturnValue(1) } as any,
        {} as any,
        {} as any
    );

    // Without the relations the admin list has no file name, chatbot or
    // workspace to show, only bare ids.
    it('populates the file, chatbot and workspace of each entry', async () => {
        await controller.findAll(
            { _search: {}, _limit: 20, _offset: 0, _order: {} } as any,
            undefined,
            { workspace: 'w1' },
            undefined
        );

        expect(ragService.findAllWithJoined).toHaveBeenCalledWith(
            { deletedAt: null, workspace: 'w1' },
            expect.objectContaining({
                populate: ['attachment', 'chatbot', 'workspace'],
            })
        );
    });
});
