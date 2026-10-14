import { wrap } from '@mikro-orm/core';
import { EntityManager } from '@mikro-orm/postgresql';
import {
    BadRequestException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import {
    compileSkill,
    skillStepsSchema,
    validateSkillSteps,
    type SkillStep,
    type SkillToolNamer,
} from '@repo/agent-blueprint';
import { plainToInstance } from 'class-transformer';
import slugify from 'slugify';
import { IPaginationOrder } from 'src/common/pagination/interfaces/pagination.interface';
import { AwsS3Dto } from 'src/modules/aws/dtos/aws.s3.dto';
import { ENUM_AWS_S3_ACCESSIBILITY } from 'src/modules/aws/enums/aws.enum';
import { AwsS3Service } from 'src/modules/aws/services/aws.s3.service';
import { CreateSkillRequestDto } from 'src/modules/skill/dtos/request/create-skill.request.dto';
import { UpdateSkillRequestDto } from 'src/modules/skill/dtos/request/update-skill.request.dto';
import { SkillGetResponseDto } from 'src/modules/skill/dtos/response/skill.get.response.dto';
import { SkillListResponseDto } from 'src/modules/skill/dtos/response/skill.list.response.dto';
import {
    SKILL_INSTRUCTIONS_MAX_LENGTH,
    TOOL_NAME_INVALID,
} from 'src/modules/skill/constants/skill.constant';
import { ENUM_SKILL_FORMAT } from 'src/modules/skill/enums/skill-format.enum';
import { ENUM_SKILL_STATUS } from 'src/modules/skill/enums/skill-status.enum';
import { ISkillSource } from 'src/modules/skill/interfaces/skill.interface';
import { SkillEntity } from 'src/modules/skill/repository/entities/skill.entity';
import {
    SkillRepository,
    SkillScope,
} from 'src/modules/skill/repository/repositories/skill.repository';
import { ENUM_TOOL_KIND } from 'src/modules/tool/enums/tool-kind.enum';
import { ToolRepository } from 'src/modules/tool/repository/repositories/tool.repository';
import { UserEntity } from 'src/modules/user/repository/entities/user.entity';
import { WorkspaceEntity } from 'src/modules/workspace/repository/entities/workspace.entity';

const S3_PRIVATE = { access: ENUM_AWS_S3_ACCESSIBILITY.PRIVATE };

@Injectable()
export class SkillService {
    constructor(
        private readonly skillRepository: SkillRepository,
        private readonly awsS3Service: AwsS3Service,
        private readonly em: EntityManager,
        private readonly toolRepository: ToolRepository
    ) {}

    async findAllByWorkspace(
        workspaceId: string,
        find: Record<string, any>,
        scope: SkillScope,
        options: { limit?: number; offset?: number; order?: IPaginationOrder }
    ): Promise<SkillEntity[]> {
        return this.skillRepository.findAllScoped(
            workspaceId,
            find,
            scope,
            options
        );
    }

    async getTotalByWorkspace(
        workspaceId: string,
        find: Record<string, any>,
        scope: SkillScope
    ): Promise<number> {
        return this.skillRepository.countScoped(workspaceId, find, scope);
    }

    // Copy-on-add: clone a builtin template into a workspace-owned skill
    // (new DB row + copied S3 object) so the workspace can edit it freely.
    async cloneFromTemplate(
        workspaceId: string,
        templateId: string,
        user: UserEntity
    ): Promise<SkillEntity> {
        const template = await this.skillRepository.findOneTemplate(templateId);
        if (!template) throw new NotFoundException('skill.get.error.notFound');

        const buffer = await this.awsS3Service.getItemBuffer(
            template.s3.key,
            S3_PRIVATE
        );
        const slug = await this.mintSlug(template.name, workspaceId);
        const key = `skills/${workspaceId}/${slug}.md`;
        const uploaded = await this.awsS3Service.putItem(
            { key, file: buffer, size: buffer.length },
            S3_PRIVATE
        );
        try {
            return await this.skillRepository.create({
                workspace: this.em.getReference(WorkspaceEntity, workspaceId),
                name: template.name,
                slug,
                description: template.description,
                status: template.status,
                format: template.format,
                steps: template.steps,
                guardrails: template.guardrails,
                instructions: template.instructions,
                s3: this.toS3Embedded(uploaded),
                createdBy: user,
                updatedBy: user,
            } as any);
        } catch (e) {
            await this.awsS3Service
                .deleteItem(key, S3_PRIVATE)
                .catch(() => undefined);
            throw e;
        }
    }

    async getOne(
        workspaceId: string,
        skillId: string
    ): Promise<{ skill: SkillEntity; instructions: string }> {
        const skill = await this.skillRepository.findOneReadable(
            skillId,
            workspaceId
        );
        if (!skill) throw new NotFoundException('skill.get.error.notFound');
        return { skill, instructions: await this.readInstructions(skill) };
    }

    async create(
        workspaceId: string,
        dto: CreateSkillRequestDto,
        user: UserEntity
    ): Promise<SkillEntity> {
        const source = this.sourceOf(dto);
        const buffer = Buffer.from(
            await this.compileBody(workspaceId, dto.name, source),
            'utf-8'
        );
        const slug = await this.mintSlug(dto.name, workspaceId);
        const key = `skills/${workspaceId}/${slug}.md`;

        // Dual-write: S3 first, then DB. On DB failure, best-effort S3 cleanup.
        const uploaded = await this.awsS3Service.putItem(
            { key, file: buffer, size: buffer.length },
            S3_PRIVATE
        );
        try {
            return await this.skillRepository.create({
                workspace: this.em.getReference(WorkspaceEntity, workspaceId),
                name: dto.name,
                slug,
                description: dto.description,
                status: dto.status ?? ENUM_SKILL_STATUS.ACTIVE,
                ...source,
                s3: this.toS3Embedded(uploaded),
                createdBy: user,
                updatedBy: user,
            } as any);
        } catch (e) {
            await this.awsS3Service
                .deleteItem(key, S3_PRIVATE)
                .catch(() => undefined);
            throw e;
        }
    }

    async update(
        workspaceId: string,
        skillId: string,
        dto: UpdateSkillRequestDto,
        user: UserEntity
    ): Promise<SkillEntity> {
        const skill = await this.skillRepository.findOneOwned(
            skillId,
            workspaceId
        );
        if (!skill) throw new NotFoundException('skill.get.error.notFound');

        await this.applyUpdate(workspaceId, skill, dto);
        skill.updatedBy = user;
        await this.em.flush();
        return skill;
    }

    async softDelete(
        workspaceId: string,
        skillId: string
    ): Promise<SkillEntity> {
        const skill = await this.skillRepository.findOneOwned(
            skillId,
            workspaceId
        );
        if (!skill) throw new NotFoundException('skill.get.error.notFound');
        await this.awsS3Service
            .deleteItem(skill.s3.key, S3_PRIVATE)
            .catch(() => undefined);
        skill.deleted = true;
        skill.deletedAt = new Date();
        await this.em.flush();
        return skill;
    }

    // -------------------------------------------------------------------------
    // Builtin templates (workspace = null) — admin-managed catalog.
    // -------------------------------------------------------------------------

    async findAllBuiltin(
        find: Record<string, any>,
        options: { limit?: number; offset?: number; order?: IPaginationOrder }
    ): Promise<SkillEntity[]> {
        return this.skillRepository.findAllScoped(
            '',
            find,
            'template',
            options
        );
    }

    async getTotalBuiltin(find: Record<string, any>): Promise<number> {
        return this.skillRepository.countScoped('', find, 'template');
    }

    async getOneBuiltin(
        skillId: string
    ): Promise<{ skill: SkillEntity; instructions: string }> {
        const skill = await this.skillRepository.findOneTemplate(skillId);
        if (!skill) throw new NotFoundException('skill.get.error.notFound');
        return { skill, instructions: await this.readInstructions(skill) };
    }

    async createBuiltin(
        dto: CreateSkillRequestDto,
        user: UserEntity
    ): Promise<SkillEntity> {
        const source = this.sourceOf(dto);
        const buffer = Buffer.from(
            await this.compileBody(null, dto.name, source),
            'utf-8'
        );
        const slug = await this.mintBuiltinSlug(dto.name);
        const key = `skills/builtin/${slug}.md`;

        const uploaded = await this.awsS3Service.putItem(
            { key, file: buffer, size: buffer.length },
            S3_PRIVATE
        );
        try {
            return await this.skillRepository.create({
                workspace: null,
                name: dto.name,
                slug,
                description: dto.description,
                status: dto.status ?? ENUM_SKILL_STATUS.ACTIVE,
                ...source,
                s3: this.toS3Embedded(uploaded),
                createdBy: user,
                updatedBy: user,
            } as any);
        } catch (e) {
            await this.awsS3Service
                .deleteItem(key, S3_PRIVATE)
                .catch(() => undefined);
            throw e;
        }
    }

    async updateBuiltin(
        skillId: string,
        dto: UpdateSkillRequestDto,
        user: UserEntity
    ): Promise<SkillEntity> {
        const skill = await this.skillRepository.findOneTemplate(skillId);
        if (!skill) throw new NotFoundException('skill.get.error.notFound');

        await this.applyUpdate(null, skill, dto);
        skill.updatedBy = user;
        await this.em.flush();
        return skill;
    }

    async softDeleteBuiltin(skillId: string): Promise<void> {
        const skill = await this.skillRepository.findOneTemplate(skillId);
        if (!skill) throw new NotFoundException('skill.get.error.notFound');
        await this.awsS3Service
            .deleteItem(skill.s3.key, S3_PRIVATE)
            .catch(() => undefined);
        skill.deleted = true;
        skill.deletedAt = new Date();
        await this.em.flush();
    }

    // -------------------------------------------------------------------------
    // System-wide (admin) — every skill across all workspaces + builtin.
    // -------------------------------------------------------------------------

    async findAllSystem(
        find: Record<string, any>,
        options: { limit?: number; offset?: number; order?: IPaginationOrder }
    ): Promise<SkillEntity[]> {
        return this.skillRepository.findAllScoped('', find, 'system', {
            ...options,
            populate: ['workspace'],
        });
    }

    async getTotalSystem(find: Record<string, any>): Promise<number> {
        return this.skillRepository.countScoped('', find, 'system');
    }

    async getOneAny(
        skillId: string
    ): Promise<{ skill: SkillEntity; instructions: string }> {
        const skill = await this.skillRepository.findOneAnyById(skillId);
        if (!skill) throw new NotFoundException('skill.get.error.notFound');
        return { skill, instructions: await this.readInstructions(skill) };
    }

    // Admin moderation delete — works for builtin and workspace-owned skills.
    // Returns the pre-delete entity (workspace populated) so callers can audit-log it.
    async softDeleteAny(skillId: string): Promise<SkillEntity> {
        const skill = await this.skillRepository.findOneAnyById(skillId);
        if (!skill) throw new NotFoundException('skill.get.error.notFound');
        await this.awsS3Service
            .deleteItem(skill.s3.key, S3_PRIVATE)
            .catch(() => undefined);
        skill.deleted = true;
        skill.deletedAt = new Date();
        await this.em.flush();
        return skill;
    }

    private async mintBuiltinSlug(name: string): Promise<string> {
        const base =
            slugify(name, { lower: true, strict: true, trim: true }) || 'skill';
        let slug = base;
        for (let i = 0; i < 50; i++) {
            const existing =
                await this.skillRepository.findOneBuiltinBySlug(slug);
            if (!existing) return slug;
            slug = `${base}-${i + 2}`;
        }
        return `${base}-${Date.now()}`;
    }

    mapList(skills: SkillEntity[]): SkillListResponseDto[] {
        return skills.map(skill => {
            const obj = wrap(skill).toObject() as any;
            return plainToInstance(
                SkillListResponseDto,
                {
                    ...obj,
                    isBuiltin: !skill.workspace,
                    workspaceId: obj.workspace?.id,
                    workspaceName: obj.workspace?.name,
                },
                { excludeExtraneousValues: true }
            );
        });
    }

    mapOne(skill: SkillEntity, instructions: string): SkillGetResponseDto {
        return plainToInstance(
            SkillGetResponseDto,
            {
                ...wrap(skill).toObject(),
                isBuiltin: !skill.workspace,
                instructions,
            },
            { excludeExtraneousValues: true }
        );
    }

    // Applies an update and, when anything the agent reads changed, rewrites
    // the S3 body. Workspace null = builtin template (no tools to point at).
    private async applyUpdate(
        workspaceId: string | null,
        skill: SkillEntity,
        dto: UpdateSkillRequestDto
    ): Promise<void> {
        const format = dto.format ?? skill.format ?? ENUM_SKILL_FORMAT.CONTENT;
        const name = dto.name ?? skill.name;
        const recompile =
            dto.instructions !== undefined ||
            dto.steps !== undefined ||
            dto.guardrails !== undefined ||
            (dto.format !== undefined && dto.format !== skill.format) ||
            (dto.name !== undefined && format === ENUM_SKILL_FORMAT.STEPS);

        if (recompile) {
            const source = this.sourceOf({
                format,
                guardrails: dto.guardrails ?? skill.guardrails,
                steps: dto.steps ?? skill.steps,
                instructions:
                    dto.instructions ??
                    (format === ENUM_SKILL_FORMAT.CONTENT
                        ? await this.readInstructions(skill)
                        : undefined),
            });
            const buffer = Buffer.from(
                await this.compileBody(workspaceId, name, source),
                'utf-8'
            );
            await this.awsS3Service.putItem(
                { key: skill.s3.key, file: buffer, size: buffer.length },
                S3_PRIVATE
            );
            Object.assign(skill, source);
            skill.s3.size = buffer.length;
            // The S3 object is overwritten in place, so `updatedAt` is the only version
            // signal consumers get (apps/ai caches skill bodies keyed by it). Set it
            // explicitly: MikroORM's `onUpdate` hook is skipped when the changeset is
            // otherwise empty, which a same-length edit by the same user would be.
            skill.updatedAt = new Date();
        }
        if (dto.name !== undefined) skill.name = dto.name;
        if (dto.description !== undefined) skill.description = dto.description;
        if (dto.status !== undefined) skill.status = dto.status;
    }

    // What the owner wrote, normalised: a skill keeps either `instructions`
    // (CONTENT) or `steps` (STEPS), never both.
    private sourceOf(dto: {
        format?: ENUM_SKILL_FORMAT;
        instructions?: string;
        steps?: SkillStep[];
        guardrails?: string[];
    }): ISkillSource {
        const format = dto.format ?? ENUM_SKILL_FORMAT.CONTENT;
        const guardrails = (dto.guardrails ?? [])
            .map(g => g.trim())
            .filter(Boolean);
        if (format === ENUM_SKILL_FORMAT.STEPS) {
            const parsed = skillStepsSchema.safeParse(dto.steps ?? []);
            if (!parsed.success) this.throwInvalidSteps([{ code: 'invalid' }]);
            return {
                format,
                guardrails,
                steps: parsed.data,
                instructions: null,
            };
        }
        if (!dto.instructions?.trim()) {
            throw new BadRequestException({
                statusCode: 400,
                message: 'skill.error.instructionsRequired',
            });
        }
        return {
            format,
            guardrails,
            steps: null,
            instructions: dto.instructions,
        };
    }

    private async compileBody(
        workspaceId: string | null,
        name: string,
        source: ISkillSource
    ): Promise<string> {
        let body: string;
        if (source.format === ENUM_SKILL_FORMAT.STEPS) {
            const toolName = await this.toolNamer(workspaceId, source.steps);
            const issues = validateSkillSteps(source.steps, { toolName });
            if (issues.length) this.throwInvalidSteps(issues);
            body = compileSkill({
                name,
                guardrails: source.guardrails,
                format: 'STEPS',
                steps: source.steps,
                toolName,
            });
        } else {
            body = compileSkill({
                name,
                guardrails: source.guardrails,
                format: 'CONTENT',
                content: source.instructions,
            });
        }
        if (body.length > SKILL_INSTRUCTIONS_MAX_LENGTH) {
            throw new BadRequestException({
                statusCode: 400,
                message: 'skill.error.tooLong',
            });
        }
        return body;
    }

    // Resolves a Tool step to the function name the agent sees (same rule as
    // apps/ai operator_tools: HTTP tools by slug, MCP tools by action name).
    private async toolNamer(
        workspaceId: string | null,
        steps: SkillStep[]
    ): Promise<SkillToolNamer> {
        const ids = [...new Set(this.toolIdsOf(steps))];
        const tools =
            workspaceId && ids.length
                ? await this.toolRepository.findByIdsInWorkspace(
                      ids,
                      workspaceId
                  )
                : [];
        const byId = new Map(tools.map(t => [t.id, t]));
        return ({ toolId, action }) => {
            const tool = byId.get(toolId);
            if (!tool) return undefined;
            if (tool.kind === ENUM_TOOL_KIND.HTTP) {
                return tool.slug.replace(TOOL_NAME_INVALID, '_');
            }
            const known = (tool.discoveredActions ?? []).some(
                a => a.name === action
            );
            return known ? action!.replace(TOOL_NAME_INVALID, '_') : undefined;
        };
    }

    private toolIdsOf(steps: SkillStep[]): string[] {
        return steps.flatMap(step => {
            if (step.type === 'tool') return step.toolId ? [step.toolId] : [];
            if (step.type === 'if') {
                return [
                    ...step.branches.flatMap(b => this.toolIdsOf(b.steps)),
                    ...this.toolIdsOf(step.otherwise ?? []),
                ];
            }
            return [];
        });
    }

    private throwInvalidSteps(issues: unknown[]): never {
        throw new BadRequestException({
            statusCode: 400,
            message: 'skill.error.invalidSteps',
            data: { issues },
        });
    }

    // CONTENT source: the stored markdown, or the S3 body for skills made
    // before it was stored. STEPS: the compiled body (a read-only preview).
    private async readInstructions(skill: SkillEntity): Promise<string> {
        if (
            skill.format !== ENUM_SKILL_FORMAT.STEPS &&
            skill.instructions != null
        ) {
            return skill.instructions;
        }
        const buffer = await this.awsS3Service.getItemBuffer(
            skill.s3.key,
            S3_PRIVATE
        );
        return buffer.toString('utf-8');
    }

    private toS3Embedded(uploaded: AwsS3Dto): Record<string, any> {
        return {
            bucket: uploaded.bucket,
            key: uploaded.key,
            completedUrl: uploaded.completedUrl,
            cdnUrl: uploaded.cdnUrl,
            mime: uploaded.mime,
            extension: uploaded.extension,
            size: uploaded.size,
        };
    }

    private async mintSlug(name: string, workspaceId: string): Promise<string> {
        const base =
            slugify(name, { lower: true, strict: true, trim: true }) || 'skill';
        let slug = base;
        for (let i = 0; i < 50; i++) {
            const existing =
                await this.skillRepository.findOneBySlugInWorkspace(
                    slug,
                    workspaceId
                );
            if (!existing) return slug;
            slug = `${base}-${i + 2}`;
        }
        return `${base}-${Date.now()}`;
    }
}
