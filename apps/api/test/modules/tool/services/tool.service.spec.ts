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
import { ConflictException, NotFoundException } from '@nestjs/common';

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
});
