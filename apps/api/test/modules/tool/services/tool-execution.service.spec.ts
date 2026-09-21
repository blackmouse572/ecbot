import { Test } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ToolExecutionService } from 'src/modules/tool/services/tool-execution.service';
import { ToolRepository } from 'src/modules/tool/repository/repositories/tool.repository';
import { ToolInvocationRepository } from 'src/modules/tool/repository/repositories/tool-invocation.repository';
import { HttpToolExecutorService } from 'src/modules/tool/services/http-tool-executor.service';
import { McpToolExecutorService } from 'src/modules/tool/services/mcp-tool-executor.service';
import { ENUM_TOOL_KIND } from 'src/modules/tool/enums/tool-kind.enum';
import { ENUM_TOOL_INVOCATION_STATUS } from 'src/modules/tool/enums/tool-invocation-status.enum';

describe('ToolExecutionService', () => {
    let svc: ToolExecutionService;
    const mockEm = {
        persistAndFlush: jest.fn(),
        // The service builds entity refs via em.getReference before persisting.
        getReference: jest.fn((_cls: any, id: string) => ({ id })),
    };
    const mockToolRepo: any = { findOne: jest.fn() };
    const mockInvocationRepo: any = {
        create: jest.fn((data: any) => ({ id: 'inv-1', ...data })),
        getEntityManager: () => mockEm,
    };
    const mockHttp: any = { execute: jest.fn() };
    const mockMcp: any = { execute: jest.fn() };

    beforeEach(async () => {
        jest.clearAllMocks();
        const mod = await Test.createTestingModule({
            providers: [
                ToolExecutionService,
                { provide: ToolRepository, useValue: mockToolRepo },
                {
                    provide: ToolInvocationRepository,
                    useValue: mockInvocationRepo,
                },
                { provide: HttpToolExecutorService, useValue: mockHttp },
                { provide: McpToolExecutorService, useValue: mockMcp },
            ],
        }).compile();
        svc = mod.get(ToolExecutionService);
    });

    it('dispatches HTTP tools to HttpToolExecutor with tool entity and args', async () => {
        const tool = { id: 't-1', kind: ENUM_TOOL_KIND.HTTP };
        mockToolRepo.findOne.mockResolvedValue(tool);
        mockHttp.execute.mockResolvedValue({
            status: ENUM_TOOL_INVOCATION_STATUS.SUCCESS,
            result: { ok: true },
            durationMs: 42,
        });

        await svc.execute({
            toolId: 't-1',
            args: { x: 1 },
            chatbotId: 'cb-1',
            conversationId: 'conv-1',
            correlationId: 'corr-1',
        });

        expect(mockHttp.execute).toHaveBeenCalledWith(tool, { x: 1 });
    });

    it('persists a ToolInvocation row with result fields, correlationId, actionName, and input args', async () => {
        const tool = { id: 't-1', kind: ENUM_TOOL_KIND.HTTP };
        mockToolRepo.findOne.mockResolvedValue(tool);
        mockHttp.execute.mockResolvedValue({
            status: ENUM_TOOL_INVOCATION_STATUS.SUCCESS,
            result: { ok: true },
            durationMs: 42,
        });

        await svc.execute({
            toolId: 't-1',
            actionName: 'doThing',
            args: { x: 1 },
            chatbotId: 'cb-1',
            conversationId: 'conv-1',
            correlationId: 'corr-1',
        });

        const created = mockInvocationRepo.create.mock.calls[0][0];
        expect(created.tool).toEqual({ id: 't-1' });
        expect(created.chatbot).toEqual({ id: 'cb-1' });
        expect(created.conversationId).toBe('conv-1');
        expect(created.correlationId).toBe('corr-1');
        expect(created.status).toBe(ENUM_TOOL_INVOCATION_STATUS.SUCCESS);
        expect(created.actionName).toBe('doThing');
        expect(created.inputArgs).toEqual({ x: 1 });
        expect(created.outputResult).toEqual({ ok: true });
        expect(created.durationMs).toBe(42);
        expect(mockEm.persistAndFlush).toHaveBeenCalled();
    });

    it('dispatches MCP tools to McpToolExecutor and persists ToolInvocation', async () => {
        const tool = { id: 't-mcp', kind: ENUM_TOOL_KIND.MCP };
        mockToolRepo.findOne.mockResolvedValue(tool);
        mockMcp.execute.mockResolvedValue({
            status: ENUM_TOOL_INVOCATION_STATUS.SUCCESS,
            result: { sent: true },
            durationMs: 17,
        });

        const outcome = await svc.execute({
            toolId: 't-mcp',
            actionName: 'sendEmail',
            args: { to: 'a@b.c' },
            chatbotId: 'cb-1',
            conversationId: 'conv-1',
            correlationId: 'corr-1',
        });

        expect(mockMcp.execute).toHaveBeenCalledWith(tool, 'sendEmail', {
            to: 'a@b.c',
        });
        expect(outcome.status).toBe(ENUM_TOOL_INVOCATION_STATUS.SUCCESS);
        expect(outcome.invocationId).toBe('inv-1');

        const created = mockInvocationRepo.create.mock.calls[0][0];
        expect(created.tool).toEqual({ id: 't-mcp' });
        expect(created.actionName).toBe('sendEmail');
        expect(created.status).toBe(ENUM_TOOL_INVOCATION_STATUS.SUCCESS);
        expect(created.outputResult).toEqual({ sent: true });
        expect(created.durationMs).toBe(17);
        expect(mockEm.persistAndFlush).toHaveBeenCalled();
    });

    it('throws BadRequestException for MCP tools when actionName is missing', async () => {
        mockToolRepo.findOne.mockResolvedValue({
            id: 't-mcp',
            kind: ENUM_TOOL_KIND.MCP,
        });
        await expect(
            svc.execute({
                toolId: 't-mcp',
                args: {},
                chatbotId: 'cb-1',
                correlationId: 'corr-1',
            })
        ).rejects.toBeInstanceOf(BadRequestException);
        expect(mockMcp.execute).not.toHaveBeenCalled();
    });

    it('throws NotFoundException when tool does not exist', async () => {
        mockToolRepo.findOne.mockResolvedValue(null);
        await expect(
            svc.execute({
                toolId: 'missing',
                args: {},
                chatbotId: 'cb-1',
                correlationId: 'corr-1',
            })
        ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('splits composite id `<toolId>:<actionName>`; lookup uses bare toolId and dispatches with parsed action', async () => {
        const tool = { id: 't-mcp', kind: ENUM_TOOL_KIND.MCP };
        mockToolRepo.findOne.mockResolvedValue(tool);
        mockMcp.execute.mockResolvedValue({
            status: ENUM_TOOL_INVOCATION_STATUS.SUCCESS,
            result: { ok: true },
            durationMs: 5,
        });

        await svc.execute({
            toolId: 't-mcp:sendEmail',
            args: { to: 'a@b.c' },
            chatbotId: 'cb-1',
            correlationId: 'corr-1',
        });

        expect(mockToolRepo.findOne).toHaveBeenCalledWith({
            id: 't-mcp',
            deleted: false,
        });
        expect(mockMcp.execute).toHaveBeenCalledWith(tool, 'sendEmail', {
            to: 'a@b.c',
        });
        const created = mockInvocationRepo.create.mock.calls[0][0];
        expect(created.tool).toEqual({ id: 't-mcp' });
        expect(created.actionName).toBe('sendEmail');
    });

    it('when cmd.actionName is explicitly set, it overrides any composite-id suffix', async () => {
        const tool = { id: 't-mcp', kind: ENUM_TOOL_KIND.MCP };
        mockToolRepo.findOne.mockResolvedValue(tool);
        mockMcp.execute.mockResolvedValue({
            status: ENUM_TOOL_INVOCATION_STATUS.SUCCESS,
            result: { ok: true },
            durationMs: 5,
        });

        await svc.execute({
            toolId: 't-mcp:fromComposite',
            actionName: 'explicit',
            args: {},
            chatbotId: 'cb-1',
            correlationId: 'corr-1',
        });

        expect(mockMcp.execute).toHaveBeenCalledWith(tool, 'explicit', {});
        const created = mockInvocationRepo.create.mock.calls[0][0];
        expect(created.tool).toEqual({ id: 't-mcp' });
        expect(created.actionName).toBe('explicit');
    });

    it('plain HTTP id (no colon) works as before', async () => {
        const tool = { id: 't-1', kind: ENUM_TOOL_KIND.HTTP };
        mockToolRepo.findOne.mockResolvedValue(tool);
        mockHttp.execute.mockResolvedValue({
            status: ENUM_TOOL_INVOCATION_STATUS.SUCCESS,
            result: { ok: true },
            durationMs: 10,
        });

        await svc.execute({
            toolId: 't-1',
            args: { x: 1 },
            chatbotId: 'cb-1',
            correlationId: 'corr-1',
        });

        expect(mockToolRepo.findOne).toHaveBeenCalledWith({
            id: 't-1',
            deleted: false,
        });
        expect(mockHttp.execute).toHaveBeenCalledWith(tool, { x: 1 });
        const created = mockInvocationRepo.create.mock.calls[0][0];
        expect(created.tool).toEqual({ id: 't-1' });
    });
});
