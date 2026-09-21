import { EntityManager } from '@mikro-orm/postgresql';
import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { AwsS3Service } from '../../../../src/modules/aws/services/aws.s3.service';
import { CreateSkillRequestDto } from '../../../../src/modules/skill/dtos/request/create-skill.request.dto';
import { UpdateSkillRequestDto } from '../../../../src/modules/skill/dtos/request/update-skill.request.dto';
import { SkillRepository } from '../../../../src/modules/skill/repository/repositories/skill.repository';
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
});
