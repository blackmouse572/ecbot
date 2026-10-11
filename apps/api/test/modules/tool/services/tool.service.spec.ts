import { Test } from '@nestjs/testing';
import { ToolService } from 'src/modules/tool/services/tool.service';
import { ToolRepository } from 'src/modules/tool/repository/repositories/tool.repository';
import { ChatbotToolRepository } from 'src/modules/tool/repository/repositories/chatbot-tool.repository';
import { ToolInvocationRepository } from 'src/modules/tool/repository/repositories/tool-invocation.repository';
import { HelperEncryptionService } from 'src/common/helper/services/helper.encryption.service';
import { McpDiscoveryService } from 'src/modules/tool/services/mcp-discovery.service';
import { HttpToolExecutorService } from 'src/modules/tool/services/http-tool-executor.service';
import { SlugMinter } from 'src/modules/tool/services/slug-minter.service';
import { InstallerRegistry } from 'src/modules/tool/installers/installer-registry.service';
import { ENUM_TOOL_KIND } from 'src/modules/tool/enums/tool-kind.enum';
import {
    ENUM_HTTP_METHOD,
    ToolEntity,
} from 'src/modules/tool/repository/entities/tool.entity';
import {
    BadGatewayException,
    BadRequestException,
    ConflictException,
    NotFoundException,
} from '@nestjs/common';
import { ENUM_MCP_PROVIDER } from 'src/modules/tool/enums/mcp-provider.enum';
import { ENUM_TOOL_STATUS } from 'src/modules/tool/enums/tool-status.enum';

describe('ToolService', () => {
    let svc: ToolService;
    const mockEm: any = {
        persistAndFlush: jest.fn(),
        removeAndFlush: jest.fn(),
        flush: jest.fn(),
        persist: jest.fn().mockReturnThis(),
    };
    const mockRepo: any = {
        getEntityManager: () => mockEm,
        create: jest.fn(data => Object.assign(new ToolEntity(), data)),
        findOneInWorkspace: jest.fn(),
        findByWorkspaceId: jest.fn().mockResolvedValue([]),
        assign: jest.fn((entity, dto) => Object.assign(entity, dto)),
    };
    const mockChatbotTool: any = { count: jest.fn().mockResolvedValue(0) };
    const mockInvocationRepo: any = {
        findRecentByChatbotId: jest.fn().mockResolvedValue([]),
    };
    const mockDiscovery: any = { connect: jest.fn() };
    const mockEnc: any = {
        envelopeEncrypt: jest.fn(p => `v1:enc:${p}`),
        envelopeDecrypt: jest.fn(c => c.replace('v1:enc:', '')),
    };
    const mockHttp: any = { execute: jest.fn(), executeWithConfig: jest.fn() };
    const mockSlugMinter: any = { mint: jest.fn(async (s: string) => s) };
    const mockInstallerRegistry: any = { get: jest.fn() };

    beforeEach(async () => {
        jest.clearAllMocks();
        const mod = await Test.createTestingModule({
            providers: [
                ToolService,
                { provide: ToolRepository, useValue: mockRepo },
                { provide: ChatbotToolRepository, useValue: mockChatbotTool },
                {
                    provide: ToolInvocationRepository,
                    useValue: mockInvocationRepo,
                },
                { provide: HelperEncryptionService, useValue: mockEnc },
                { provide: McpDiscoveryService, useValue: mockDiscovery },
                { provide: HttpToolExecutorService, useValue: mockHttp },
                { provide: SlugMinter, useValue: mockSlugMinter },
                { provide: InstallerRegistry, useValue: mockInstallerRegistry },
            ],
        }).compile();
        svc = mod.get(ToolService);
    });

    it('createHttp envelope-encrypts the credential', async () => {
        await svc.createHttp('ws-1', {
            name: 'X',
            description: 'd',
            httpMethod: ENUM_HTTP_METHOD.GET,
            httpUrl: 'https://example.com',
            inputSchema: { type: 'object' },
            credential: 'secret123',
        } as any);
        expect(mockEnc.envelopeEncrypt).toHaveBeenCalledWith('secret123');
        const created = mockRepo.create.mock.calls[0][0];
        expect(created.httpCredential).toBe('v1:enc:secret123');
        expect(created.kind).toBe(ENUM_TOOL_KIND.HTTP);
    });

    it('createHttp leaves credential undefined when not provided', async () => {
        await svc.createHttp('ws-1', {
            name: 'X',
            description: 'd',
            httpMethod: ENUM_HTTP_METHOD.GET,
            httpUrl: 'https://example.com',
            inputSchema: { type: 'object' },
        } as any);
        expect(mockEnc.envelopeEncrypt).not.toHaveBeenCalled();
    });

    // #176: a wrong URL or a rotated token used to mean delete and recreate,
    // losing every chatbot link.
    describe('update connection settings (#176)', () => {
        const mcpTool = () =>
            Object.assign(new ToolEntity(), {
                id: 't-1',
                kind: ENUM_TOOL_KIND.MCP,
                mcpProvider: ENUM_MCP_PROVIDER.OPERATOR,
                mcpServerUrl: 'https://old.example.com/mcp',
                mcpAuth: { type: 'bearer' },
                mcpCredential: 'v1:enc:old',
            });

        it('changes an HTTP tool method, URL, auth and credential', async () => {
            const tool = Object.assign(new ToolEntity(), {
                id: 't-1',
                kind: ENUM_TOOL_KIND.HTTP,
                httpMethod: ENUM_HTTP_METHOD.GET,
                httpUrl: 'https://old.example.com',
            });
            mockRepo.findOneInWorkspace.mockResolvedValue(tool);

            await svc.update('ws-1', 't-1', {
                httpMethod: ENUM_HTTP_METHOD.POST,
                httpUrl: 'https://new.example.com/orders',
                auth: { type: 'bearer' },
                credential: 'new-token',
            } as any);

            expect(tool).toMatchObject({
                httpMethod: ENUM_HTTP_METHOD.POST,
                httpUrl: 'https://new.example.com/orders',
                httpAuth: { type: 'bearer' },
                httpCredential: 'v1:enc:new-token',
            });
        });

        it('changes an MCP server URL, auth and credential, then rediscovers', async () => {
            const tool = mcpTool();
            mockRepo.findOneInWorkspace.mockResolvedValue(tool);
            mockDiscovery.discover = jest
                .fn()
                .mockResolvedValue([{ name: 'list_orders' }]);

            await svc.update('ws-1', 't-1', {
                serverUrl: 'https://new.example.com/mcp',
                auth: {
                    type: 'api_key',
                    placement: 'header',
                    paramName: 'X-Key',
                },
                credential: 'rotated',
            } as any);

            expect(tool).toMatchObject({
                mcpServerUrl: 'https://new.example.com/mcp',
                mcpAuth: {
                    type: 'api_key',
                    placement: 'header',
                    paramName: 'X-Key',
                },
                mcpCredential: 'v1:enc:rotated',
                discoveredActions: [{ name: 'list_orders' }],
            });
            expect(tool.httpUrl).toBeUndefined();
            expect(tool.httpCredential).toBeUndefined();
        });

        it('drops the stored credential when auth is switched off', async () => {
            const tool = mcpTool();
            mockRepo.findOneInWorkspace.mockResolvedValue(tool);
            mockDiscovery.discover = jest.fn().mockResolvedValue([]);

            await svc.update('ws-1', 't-1', { auth: { type: 'none' } } as any);

            expect(tool.mcpAuth).toEqual({ type: 'none' });
            expect(tool.mcpCredential).toBeNull();
        });

        // #247 review: a stored key must not follow a URL to a new host it
        // was never meant for, since whoever edits it never saw the key.
        it('asks for the credential again when the URL moves to another origin', async () => {
            const http = Object.assign(new ToolEntity(), {
                id: 't-1',
                kind: ENUM_TOOL_KIND.HTTP,
                httpUrl: 'https://api.shop.vn/orders',
                httpAuth: { type: 'bearer' },
                httpCredential: 'v1:enc:secret',
            });
            mockRepo.findOneInWorkspace.mockResolvedValue(http);
            await expect(
                svc.update('ws-1', 't-1', {
                    httpUrl: 'https://attacker.example/orders',
                } as any)
            ).rejects.toBeInstanceOf(BadRequestException);
            expect(http.httpUrl).toBe('https://api.shop.vn/orders');

            const mcp = mcpTool();
            mockRepo.findOneInWorkspace.mockResolvedValue(mcp);
            mockDiscovery.discover = jest.fn();
            await expect(
                svc.update('ws-1', 't-1', {
                    serverUrl: 'https://attacker.example/mcp',
                } as any)
            ).rejects.toBeInstanceOf(BadRequestException);
            expect(mockDiscovery.discover).not.toHaveBeenCalled();
        });

        it('keeps the credential for a new path on the same origin, or with a new key', async () => {
            const http = Object.assign(new ToolEntity(), {
                id: 't-1',
                kind: ENUM_TOOL_KIND.HTTP,
                httpUrl: 'https://api.shop.vn/orders',
                httpAuth: { type: 'bearer' },
                httpCredential: 'v1:enc:secret',
            });
            mockRepo.findOneInWorkspace.mockResolvedValue(http);
            await svc.update('ws-1', 't-1', {
                httpUrl: 'https://api.shop.vn/v2/orders',
            } as any);
            expect(http.httpCredential).toBe('v1:enc:secret');

            await svc.update('ws-1', 't-1', {
                httpUrl: 'https://new-host.example/orders',
                credential: 'fresh',
            } as any);
            expect(http.httpCredential).toBe('v1:enc:fresh');
        });

        it('does not reconnect when only the name changes, even with the saved connection sent back', async () => {
            const tool = mcpTool();
            mockRepo.findOneInWorkspace.mockResolvedValue(tool);
            mockDiscovery.discover = jest.fn();

            await svc.update('ws-1', 't-1', {
                name: 'Renamed',
                serverUrl: 'https://old.example.com/mcp',
                auth: { type: 'bearer' },
            } as any);

            expect(mockDiscovery.discover).not.toHaveBeenCalled();
            expect(tool.displayName).toBe('Renamed');
        });

        // #247 re-review: a tool created through the API without auth has
        // no stored auth, and the form sends { type: 'none' } back.
        it('treats missing stored auth as none, so a rename does not reconnect', async () => {
            const tool = Object.assign(mcpTool(), {
                mcpAuth: undefined,
                mcpCredential: undefined,
            });
            mockRepo.findOneInWorkspace.mockResolvedValue(tool);
            mockDiscovery.discover = jest.fn();

            await svc.update('ws-1', 't-1', {
                name: 'Renamed',
                serverUrl: 'https://old.example.com/mcp',
                auth: { type: 'none' },
            } as any);

            expect(mockDiscovery.discover).not.toHaveBeenCalled();
        });

        it('refuses auth an MCP server never receives', async () => {
            const tool = mcpTool();
            mockRepo.findOneInWorkspace.mockResolvedValue(tool);
            mockDiscovery.discover = jest.fn();

            for (const auth of [
                { type: 'basic' },
                { type: 'api_key', placement: 'query' },
            ]) {
                await expect(
                    svc.update('ws-1', 't-1', { auth } as any)
                ).rejects.toBeInstanceOf(BadRequestException);
            }
            expect(mockDiscovery.discover).not.toHaveBeenCalled();
        });

        it('keeps the saved URL of a marketplace tool, which the provider manages', async () => {
            const tool = Object.assign(mcpTool(), {
                mcpProvider: ENUM_MCP_PROVIDER.COMPOSIO,
            });
            mockRepo.findOneInWorkspace.mockResolvedValue(tool);

            await expect(
                svc.update('ws-1', 't-1', {
                    serverUrl: 'https://evil.example.com',
                } as any)
            ).rejects.toBeInstanceOf(BadRequestException);
            expect(tool.mcpServerUrl).toBe('https://old.example.com/mcp');
        });
    });

    // #175: an unreachable MCP server used to be saved anyway, with no
    // actions and no error.
    describe('MCP connection test before saving (#175)', () => {
        const createDto = {
            name: 'Shop MCP',
            description: 'd',
            serverUrl: 'https://mcp.example.com/sse',
            auth: { type: 'bearer' },
            credential: 'tok',
        } as any;

        it('saves the tool with its actions when the server answers', async () => {
            mockDiscovery.discover = jest
                .fn()
                .mockResolvedValue([{ name: 'list_orders' }]);

            const tool = await svc.createMcpOperator('ws-1', createDto);

            expect(mockDiscovery.discover.mock.calls[0][0]).toMatchObject({
                mcpServerUrl: 'https://mcp.example.com/sse',
                mcpCredential: 'v1:enc:tok',
            });
            expect(tool.discoveredActions).toEqual([{ name: 'list_orders' }]);
            expect(mockRepo.create).toHaveBeenCalled();
        });

        it('saves nothing and says why when the server cannot be reached', async () => {
            mockDiscovery.discover = jest
                .fn()
                .mockRejectedValue(new Error('ECONNREFUSED'));

            await expect(
                svc.createMcpOperator('ws-1', createDto)
            ).rejects.toBeInstanceOf(BadGatewayException);
            expect(mockRepo.create).not.toHaveBeenCalled();
            expect(mockEm.flush).not.toHaveBeenCalled();
        });

        it('keeps the old connection when a new URL cannot be reached', async () => {
            const tool = Object.assign(new ToolEntity(), {
                id: 't-1',
                kind: ENUM_TOOL_KIND.MCP,
                mcpProvider: ENUM_MCP_PROVIDER.OPERATOR,
                mcpServerUrl: 'https://old.example.com/mcp',
            });
            mockRepo.findOneInWorkspace.mockResolvedValue(tool);
            mockDiscovery.discover = jest
                .fn()
                .mockRejectedValue(new Error('ECONNREFUSED'));

            await expect(
                svc.update('ws-1', 't-1', {
                    serverUrl: 'https://typo.example.com/mcp',
                } as any)
            ).rejects.toBeInstanceOf(BadGatewayException);
            expect(tool.mcpServerUrl).toBe('https://old.example.com/mcp');
            expect(mockEm.flush).not.toHaveBeenCalled();
        });
    });

    it('getOne throws NotFound when missing', async () => {
        mockRepo.findOneInWorkspace.mockResolvedValue(null);
        await expect(svc.getOne('ws-1', 'missing')).rejects.toBeInstanceOf(
            NotFoundException
        );
    });

    it('softDelete throws Conflict when chatbot references exist', async () => {
        mockRepo.findOneInWorkspace.mockResolvedValue({ id: 't-1' });
        mockChatbotTool.count.mockResolvedValue(2);
        await expect(svc.softDelete('ws-1', 't-1')).rejects.toBeInstanceOf(
            ConflictException
        );
    });

    describe('admin (any workspace)', () => {
        beforeEach(() => {
            mockRepo.findOneAny = jest.fn();
            mockRepo.findAllPaginated = jest.fn().mockResolvedValue([]);
            mockChatbotTool.count.mockResolvedValue(0);
        });

        it('lists tools across workspaces with their workspace loaded', async () => {
            await svc.findAllSystem({ kind: 'HTTP' }, { limit: 20, offset: 0 });
            expect(mockRepo.findAllPaginated).toHaveBeenCalledWith(
                { kind: 'HTTP' },
                { limit: 20, offset: 0, populate: ['workspace'] }
            );
        });

        it('getOneAny throws NotFound for an unknown tool', async () => {
            mockRepo.findOneAny.mockResolvedValue(null);
            await expect(svc.getOneAny('t-x')).rejects.toBeInstanceOf(
                NotFoundException
            );
        });

        it('inactivate marks the tool REVOKED', async () => {
            const tool = { id: 't-1', status: ENUM_TOOL_STATUS.ACTIVE };
            mockRepo.findOneAny.mockResolvedValue(tool);
            await svc.inactivate('t-1');
            expect(tool.status).toBe(ENUM_TOOL_STATUS.REVOKED);
            expect(mockEm.flush).toHaveBeenCalled();
        });

        it('activate brings an inactivated tool back to ACTIVE', async () => {
            const tool = { id: 't-1', status: ENUM_TOOL_STATUS.REVOKED };
            mockRepo.findOneAny.mockResolvedValue(tool);
            await svc.activate('t-1');
            expect(tool.status).toBe(ENUM_TOOL_STATUS.ACTIVE);
        });

        it('activate refuses a tool whose connection is broken, since that needs the owner to reconnect', async () => {
            const tool = { id: 't-1', status: ENUM_TOOL_STATUS.NEEDS_REAUTH };
            mockRepo.findOneAny.mockResolvedValue(tool);
            await expect(svc.activate('t-1')).rejects.toBeInstanceOf(
                BadRequestException
            );
            expect(tool.status).toBe(ENUM_TOOL_STATUS.NEEDS_REAUTH);
        });

        it('softDeleteAny deletes a tool in any workspace', async () => {
            const tool: any = { id: 't-1' };
            mockRepo.findOneAny.mockResolvedValue(tool);
            await svc.softDeleteAny('t-1');
            expect(tool.deleted).toBe(true);
            expect(tool.deletedAt).toBeInstanceOf(Date);
        });

        it('softDeleteAny keeps a tool that a chatbot still uses', async () => {
            mockRepo.findOneAny.mockResolvedValue({ id: 't-1' });
            mockChatbotTool.count.mockResolvedValue(1);
            await expect(svc.softDeleteAny('t-1')).rejects.toBeInstanceOf(
                ConflictException
            );
        });

        it('getInvocationStats totals the counts per status', async () => {
            mockInvocationRepo.countByStatus = jest.fn().mockResolvedValue({
                SUCCESS: 7,
                ERROR: 2,
                TIMEOUT: 1,
            });
            mockInvocationRepo.findLastInvokedAt = jest
                .fn()
                .mockResolvedValue(new Date('2026-10-01T00:00:00Z'));
            expect(await svc.getInvocationStats('t-1')).toEqual({
                total: 10,
                success: 7,
                error: 2,
                timeout: 1,
                lastInvokedAt: new Date('2026-10-01T00:00:00Z'),
            });
        });
    });
});
