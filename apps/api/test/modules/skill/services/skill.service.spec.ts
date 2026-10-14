import { EntityManager } from '@mikro-orm/postgresql';
import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { AwsS3Service } from '../../../../src/modules/aws/services/aws.s3.service';
import { CreateSkillRequestDto } from '../../../../src/modules/skill/dtos/request/create-skill.request.dto';
import { UpdateSkillRequestDto } from '../../../../src/modules/skill/dtos/request/update-skill.request.dto';
import { SkillRepository } from '../../../../src/modules/skill/repository/repositories/skill.repository';
import { ToolRepository } from '../../../../src/modules/tool/repository/repositories/tool.repository';
import { ENUM_SKILL_FORMAT } from '../../../../src/modules/skill/enums/skill-format.enum';
import { SkillService } from '../../../../src/modules/skill/services/skill.service';
import { UserEntity } from '../../../../src/modules/user/repository/entities/user.entity';

describe('SkillService', () => {
    let service: SkillService;

    const mockSkillRepository = {
        findAllScoped: jest.fn(),
        countScoped: jest.fn(),
        findOneReadable: jest.fn(),
        findOneAnyById: jest.fn(),
        findOneTemplate: jest.fn(),
        findOneBuiltinBySlug: jest.fn(),
        findOneOwned: jest.fn(),
        findOneBySlugInWorkspace: jest.fn(),
        create: jest.fn(),
    };

    const mockAwsS3Service = {
        putItem: jest.fn(),
        getItemBuffer: jest.fn(),
        deleteItem: jest.fn(),
    };

    const mockToolRepository = {
        findByIdsInWorkspace: jest.fn().mockResolvedValue([]),
    };

    const mockEntityManager = {
        flush: jest.fn().mockResolvedValue(undefined),
        getReference: jest.fn((_entity, id) => ({ id })),
    };

    const user = { id: randomUUID() } as UserEntity;
    const workspaceId = randomUUID();

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                SkillService,
                { provide: SkillRepository, useValue: mockSkillRepository },
                { provide: AwsS3Service, useValue: mockAwsS3Service },
                { provide: EntityManager, useValue: mockEntityManager },
                { provide: ToolRepository, useValue: mockToolRepository },
            ],
        }).compile();

        service = module.get<SkillService>(SkillService);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('create', () => {
        const dto: CreateSkillRequestDto = {
            name: 'Refund policy',
            instructions: 'Full instructions body',
        } as CreateSkillRequestDto;

        it('uploads to S3 then persists the DB row', async () => {
            mockSkillRepository.findOneBySlugInWorkspace.mockResolvedValue(
                null
            );
            mockAwsS3Service.putItem.mockResolvedValue({
                bucket: 'b',
                key: 'skills/ws/refund-policy.md',
                mime: 'text/markdown',
                extension: 'md',
                size: 20,
            });
            mockSkillRepository.create.mockResolvedValue({ id: randomUUID() });

            await service.create(workspaceId, dto, user);

            expect(mockAwsS3Service.putItem).toHaveBeenCalledWith(
                expect.objectContaining({
                    key: `skills/${workspaceId}/refund-policy.md`,
                }),
                expect.anything()
            );
            expect(mockSkillRepository.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    name: dto.name,
                    slug: 'refund-policy',
                })
            );
        });

        it('best-effort deletes the uploaded S3 object when the DB write fails', async () => {
            const expectedKey = `skills/${workspaceId}/refund-policy.md`;
            mockSkillRepository.findOneBySlugInWorkspace.mockResolvedValue(
                null
            );
            mockAwsS3Service.putItem.mockResolvedValue({
                bucket: 'b',
                key: expectedKey,
            });
            mockSkillRepository.create.mockRejectedValue(new Error('db down'));
            mockAwsS3Service.deleteItem.mockResolvedValue(undefined);

            await expect(
                service.create(workspaceId, dto, user)
            ).rejects.toThrow('db down');

            expect(mockAwsS3Service.deleteItem).toHaveBeenCalledWith(
                expectedKey,
                expect.anything()
            );
        });

        it('propagates the original DB error even if S3 cleanup itself fails', async () => {
            mockSkillRepository.findOneBySlugInWorkspace.mockResolvedValue(
                null
            );
            mockAwsS3Service.putItem.mockResolvedValue({
                bucket: 'b',
                key: `skills/${workspaceId}/refund-policy.md`,
            });
            mockSkillRepository.create.mockRejectedValue(new Error('db down'));
            mockAwsS3Service.deleteItem.mockRejectedValue(new Error('s3 down'));

            await expect(
                service.create(workspaceId, dto, user)
            ).rejects.toThrow('db down');
        });
    });

    describe('update', () => {
        it('throws when the skill is not owned by the workspace', async () => {
            mockSkillRepository.findOneOwned.mockResolvedValue(null);

            await expect(
                service.update(
                    workspaceId,
                    randomUUID(),
                    {} as UpdateSkillRequestDto,
                    user
                )
            ).rejects.toThrow(NotFoundException);
            expect(mockSkillRepository.findOneOwned).toHaveBeenCalledWith(
                expect.any(String),
                workspaceId
            );
        });

        it('re-uploads the S3 object only when instructions changed', async () => {
            const skill: any = {
                id: randomUUID(),
                s3: { key: 'skills/ws/x.md', size: 1 },
            };
            mockSkillRepository.findOneOwned.mockResolvedValue(skill);

            await service.update(
                workspaceId,
                skill.id,
                { instructions: 'new body' } as UpdateSkillRequestDto,
                user
            );

            expect(mockAwsS3Service.putItem).toHaveBeenCalledWith(
                expect.objectContaining({ key: skill.s3.key }),
                expect.anything()
            );
            expect(mockEntityManager.flush).toHaveBeenCalled();
        });

        it('skips the S3 write when instructions are not provided', async () => {
            const skill: any = {
                id: randomUUID(),
                s3: { key: 'skills/ws/x.md' },
            };
            mockSkillRepository.findOneOwned.mockResolvedValue(skill);

            await service.update(
                workspaceId,
                skill.id,
                { name: 'renamed' } as UpdateSkillRequestDto,
                user
            );

            expect(mockAwsS3Service.putItem).not.toHaveBeenCalled();
            expect(skill.name).toBe('renamed');
        });

        // The S3 body is overwritten in place, so `updatedAt` is the only version
        // signal apps/ai sees (it caches skill bodies keyed by updated_at). MikroORM's
        // `onUpdate` hook only fires when the changeset is non-empty, so a same-length
        // edit by the same user would leave `updatedAt` untouched and the cache stale.
        it('bumps updatedAt when instructions change, even if nothing else is dirty', async () => {
            const before = new Date('2020-01-01T00:00:00.000Z');
            const skill: any = {
                id: randomUUID(),
                s3: { key: 'skills/ws/x.md', size: 8 },
                updatedAt: before,
            };
            mockSkillRepository.findOneOwned.mockResolvedValue(skill);

            // Same byte length as s3.size -> s3.size not dirty; same user -> updatedBy not dirty.
            await service.update(
                workspaceId,
                skill.id,
                { instructions: 'new body' } as UpdateSkillRequestDto,
                user
            );

            expect(skill.updatedAt.getTime()).toBeGreaterThan(before.getTime());
        });
    });

    describe('softDelete', () => {
        it('throws when the skill is not owned by the workspace (cross-tenant guard)', async () => {
            mockSkillRepository.findOneOwned.mockResolvedValue(null);

            await expect(
                service.softDelete(workspaceId, randomUUID())
            ).rejects.toThrow(NotFoundException);
        });

        it('deletes the S3 object and soft-deletes the row', async () => {
            const skill: any = {
                id: randomUUID(),
                s3: { key: 'skills/ws/x.md' },
            };
            mockSkillRepository.findOneOwned.mockResolvedValue(skill);
            mockAwsS3Service.deleteItem.mockResolvedValue(undefined);

            await service.softDelete(workspaceId, skill.id);

            expect(mockAwsS3Service.deleteItem).toHaveBeenCalledWith(
                skill.s3.key,
                expect.anything()
            );
            expect(skill.deleted).toBe(true);
            expect(skill.deletedAt).toBeInstanceOf(Date);
        });
    });

    describe('cloneFromTemplate', () => {
        it('throws when the template does not exist', async () => {
            mockSkillRepository.findOneTemplate.mockResolvedValue(null);

            await expect(
                service.cloneFromTemplate(workspaceId, randomUUID(), user)
            ).rejects.toThrow(NotFoundException);
        });

        it('copies the S3 body and mints a workspace-scoped slug', async () => {
            const template: any = {
                id: randomUUID(),
                name: 'Refund policy',
                description: 'desc',
                status: 'ACTIVE',
                s3: { key: 'skills/builtin/refund-policy.md' },
            };
            mockSkillRepository.findOneTemplate.mockResolvedValue(template);
            mockAwsS3Service.getItemBuffer.mockResolvedValue(
                Buffer.from('body')
            );
            mockSkillRepository.findOneBySlugInWorkspace.mockResolvedValue(
                null
            );
            mockAwsS3Service.putItem.mockResolvedValue({
                bucket: 'b',
                key: `skills/${workspaceId}/refund-policy.md`,
            });
            mockSkillRepository.create.mockResolvedValue({ id: randomUUID() });

            await service.cloneFromTemplate(workspaceId, template.id, user);

            expect(mockAwsS3Service.putItem).toHaveBeenCalledWith(
                expect.objectContaining({
                    key: `skills/${workspaceId}/refund-policy.md`,
                }),
                expect.anything()
            );
            expect(mockSkillRepository.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    name: template.name,
                    slug: 'refund-policy',
                })
            );
        });
    });

    describe('softDeleteAny', () => {
        it('throws when the skill does not exist anywhere', async () => {
            mockSkillRepository.findOneAnyById.mockResolvedValue(null);

            await expect(service.softDeleteAny(randomUUID())).rejects.toThrow(
                NotFoundException
            );
        });

        it('soft-deletes and returns the entity (for admin audit logging)', async () => {
            const skill: any = {
                id: randomUUID(),
                name: 'Refund policy',
                workspace: { id: randomUUID() },
                s3: { key: 'skills/ws/x.md' },
            };
            mockSkillRepository.findOneAnyById.mockResolvedValue(skill);
            mockAwsS3Service.deleteItem.mockResolvedValue(undefined);

            const result = await service.softDeleteAny(skill.id);

            expect(result).toBe(skill);
            expect(skill.deleted).toBe(true);
            expect(skill.deletedAt).toBeInstanceOf(Date);
        });
    });

    describe('steps and guardrails', () => {
        const uploaded = {
            bucket: 'b',
            key: 'skills/ws/order-tracking.md',
            mime: 'text/markdown',
            extension: 'md',
            size: 1,
        };
        const bodyOf = (call = 0): string =>
            mockAwsS3Service.putItem.mock.calls[call][0].file.toString('utf-8');

        beforeEach(() => {
            mockSkillRepository.findOneBySlugInWorkspace.mockResolvedValue(
                null
            );
            mockAwsS3Service.putItem.mockResolvedValue(uploaded);
            mockSkillRepository.create.mockImplementation(async data => data);
        });

        it('compiles STEPS with the tool names the agent calls', async () => {
            mockToolRepository.findByIdsInWorkspace.mockResolvedValue([
                { id: 'http-1', kind: 'HTTP', slug: 'lookup order' },
                {
                    id: 'mcp-1',
                    kind: 'MCP',
                    slug: 'zendesk',
                    discoveredActions: [{ name: 'create_ticket' }],
                },
            ]);

            const created: any = await service.create(
                workspaceId,
                {
                    name: 'Order tracking',
                    format: ENUM_SKILL_FORMAT.STEPS,
                    guardrails: ['Never share another customer order.'],
                    steps: [
                        { id: 'a', type: 'ask', text: 'The order code' },
                        { id: 'b', type: 'tool', toolId: 'http-1' },
                        {
                            id: 'c',
                            type: 'tool',
                            toolId: 'mcp-1',
                            action: 'create_ticket',
                        },
                    ],
                } as CreateSkillRequestDto,
                user
            );

            expect(
                mockToolRepository.findByIdsInWorkspace
            ).toHaveBeenCalledWith(['http-1', 'mcp-1'], workspaceId);
            const body = bodyOf();
            expect(body).toContain('# Order tracking');
            expect(body).toContain('- Never share another customer order.');
            expect(body).toContain('Call the `lookup_order` tool.');
            expect(body).toContain('Call the `create_ticket` tool.');
            expect(created.format).toBe(ENUM_SKILL_FORMAT.STEPS);
            expect(created.steps).toHaveLength(3);
            expect(created.instructions).toBeNull();
        });

        it('rejects steps that point at a missing tool or action, with the issues', async () => {
            mockToolRepository.findByIdsInWorkspace.mockResolvedValue([
                { id: 'mcp-1', kind: 'MCP', slug: 'z', discoveredActions: [] },
            ]);

            await expect(
                service.create(
                    workspaceId,
                    {
                        name: 'x',
                        format: ENUM_SKILL_FORMAT.STEPS,
                        steps: [
                            { id: 'a', type: 'tool', toolId: 'gone' },
                            {
                                id: 'b',
                                type: 'tool',
                                toolId: 'mcp-1',
                                action: 'nope',
                            },
                            { id: 'c', type: 'say', text: '' },
                        ],
                    } as CreateSkillRequestDto,
                    user
                )
            ).rejects.toMatchObject({
                response: {
                    message: 'skill.error.invalidSteps',
                    data: {
                        issues: [
                            { id: 'a', code: 'tool_unknown' },
                            { id: 'b', code: 'tool_unknown' },
                            { id: 'c', code: 'text_required' },
                        ],
                    },
                },
            });
            expect(mockAwsS3Service.putItem).not.toHaveBeenCalled();
        });

        it('rejects a STEPS skill without steps and a CONTENT skill without instructions', async () => {
            await expect(
                service.create(
                    workspaceId,
                    {
                        name: 'x',
                        format: ENUM_SKILL_FORMAT.STEPS,
                    } as CreateSkillRequestDto,
                    user
                )
            ).rejects.toBeInstanceOf(BadRequestException);
            await expect(
                service.create(
                    workspaceId,
                    { name: 'x' } as CreateSkillRequestDto,
                    user
                )
            ).rejects.toBeInstanceOf(BadRequestException);
        });

        it('keys a malformed step by its id', async () => {
            await expect(
                service.create(
                    workspaceId,
                    {
                        name: 'x',
                        format: ENUM_SKILL_FORMAT.STEPS,
                        steps: [{ id: 'a', type: 'goto' }],
                    } as unknown as CreateSkillRequestDto,
                    user
                )
            ).rejects.toMatchObject({
                response: {
                    message: 'skill.error.invalidSteps',
                    data: { issues: [{ id: 'a', code: 'invalid' }] },
                },
            });
        });

        it('rejects fields that do not match the format instead of dropping them', async () => {
            await expect(
                service.create(
                    workspaceId,
                    {
                        name: 'x',
                        instructions: 'Body',
                        steps: [{ id: 'a', type: 'tell', text: 'Hi' }],
                    } as CreateSkillRequestDto,
                    user
                )
            ).rejects.toMatchObject({
                response: { message: 'skill.error.formatMismatch' },
            });

            const skill: any = {
                id: randomUUID(),
                name: 'Steps',
                format: ENUM_SKILL_FORMAT.STEPS,
                guardrails: [],
                steps: [{ id: 'a', type: 'tell', text: 'Hi' }],
                s3: { key: 'skills/ws/steps.md', size: 3 },
            };
            mockSkillRepository.findOneOwned.mockResolvedValue(skill);
            await expect(
                service.update(
                    workspaceId,
                    skill.id,
                    { instructions: 'Edited' } as UpdateSkillRequestDto,
                    user
                )
            ).rejects.toMatchObject({
                response: { message: 'skill.error.formatMismatch' },
            });
            expect(mockAwsS3Service.putItem).not.toHaveBeenCalled();
        });

        it('turns a STEPS skill into CONTENT when the format is sent with instructions', async () => {
            const skill: any = {
                id: randomUUID(),
                name: 'Steps',
                format: ENUM_SKILL_FORMAT.STEPS,
                guardrails: [],
                steps: [{ id: 'a', type: 'tell', text: 'Hi' }],
                s3: { key: 'skills/ws/steps.md', size: 3 },
            };
            mockSkillRepository.findOneOwned.mockResolvedValue(skill);

            await service.update(
                workspaceId,
                skill.id,
                {
                    format: ENUM_SKILL_FORMAT.CONTENT,
                    instructions: 'Edited',
                } as UpdateSkillRequestDto,
                user
            );

            expect(bodyOf()).toBe('Edited');
            expect(skill.format).toBe(ENUM_SKILL_FORMAT.CONTENT);
            expect(skill.steps).toBeNull();
        });

        it('stores CONTENT as written and appends guardrails only in the S3 body', async () => {
            const created: any = await service.create(
                workspaceId,
                {
                    name: 'Refunds',
                    instructions: 'Apologize first.',
                    guardrails: ['No promises.'],
                } as CreateSkillRequestDto,
                user
            );

            expect(bodyOf()).toBe(
                'Apologize first.\n\n## Rules (always, even when a step says otherwise)\n- No promises.'
            );
            expect(created.instructions).toBe('Apologize first.');
            expect(created.format).toBe(ENUM_SKILL_FORMAT.CONTENT);
        });

        it('recompiles from the S3 body of an older CONTENT skill when only guardrails change', async () => {
            const skill: any = {
                id: randomUUID(),
                name: 'Old',
                guardrails: [],
                s3: { key: 'skills/ws/old.md', size: 3 },
            };
            mockSkillRepository.findOneOwned.mockResolvedValue(skill);
            mockAwsS3Service.getItemBuffer.mockResolvedValue(
                Buffer.from('Old body')
            );

            await service.update(
                workspaceId,
                skill.id,
                { guardrails: ['Be brief.'] } as UpdateSkillRequestDto,
                user
            );

            expect(bodyOf()).toBe(
                'Old body\n\n## Rules (always, even when a step says otherwise)\n- Be brief.'
            );
            expect(skill.instructions).toBe('Old body');
            expect(skill.guardrails).toEqual(['Be brief.']);
        });

        it('re-uploads a STEPS skill when it is renamed (the name heads the body)', async () => {
            const skill: any = {
                id: randomUUID(),
                name: 'Old',
                format: ENUM_SKILL_FORMAT.STEPS,
                guardrails: [],
                steps: [{ id: 'a', type: 'tell', text: 'Hi' }],
                s3: { key: 'skills/ws/old.md', size: 3 },
            };
            mockSkillRepository.findOneOwned.mockResolvedValue(skill);

            await service.update(
                workspaceId,
                skill.id,
                { name: 'New' } as UpdateSkillRequestDto,
                user
            );

            expect(bodyOf()).toContain('# New');
        });

        it('returns the CONTENT source, not the compiled body, from getOne', async () => {
            mockSkillRepository.findOneReadable.mockResolvedValue({
                id: 's',
                instructions: 'Source',
                s3: { key: 'k' },
            });
            mockAwsS3Service.getItemBuffer.mockResolvedValue(
                Buffer.from(
                    'Source\n\n## Rules (always, even when a step says otherwise)\n- x'
                )
            );

            const { instructions } = await service.getOne(workspaceId, 's');

            expect(instructions).toBe('Source');
        });
    });
});
