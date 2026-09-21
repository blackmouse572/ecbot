import { EntityManager } from '@mikro-orm/postgresql';
import { Injectable } from '@nestjs/common';
import { Command } from 'nestjs-command';
import { ENUM_AWS_S3_ACCESSIBILITY } from 'src/modules/aws/enums/aws.enum';
import { AwsS3Service } from 'src/modules/aws/services/aws.s3.service';
import { BUILTIN_SKILLS } from 'src/modules/skill/constants/builtin-skills.constant';
import { ENUM_SKILL_STATUS } from 'src/modules/skill/enums/skill-status.enum';
import { SkillEntity } from 'src/modules/skill/repository/entities/skill.entity';

const S3_PRIVATE = { access: ENUM_AWS_S3_ACCESSIBILITY.PRIVATE };

@Injectable()
export class MigrationSkillSeed {
    constructor(
        private readonly em: EntityManager,
        private readonly awsS3Service: AwsS3Service
    ) {}

    @Command({
        command: 'seed:skill',
        describe: 'seed builtin skill templates',
    })
    async seeds(): Promise<void> {
        const em = this.em.fork();
        for (const template of BUILTIN_SKILLS) {
            const existing = await em.findOne(SkillEntity, {
                slug: template.slug,
                workspace: null,
            });
            if (existing) continue;

            const key = `skills/builtin/${template.slug}.md`;
            const buffer = Buffer.from(template.instructions, 'utf-8');
            const uploaded = await this.awsS3Service.putItem(
                { key, file: buffer, size: buffer.length },
                S3_PRIVATE
            );

            const skill = em.create(SkillEntity, {
                workspace: null,
                name: template.name,
                slug: template.slug,
                description: template.description,
                status: ENUM_SKILL_STATUS.ACTIVE,
                s3: {
                    bucket: uploaded.bucket,
                    key: uploaded.key,
                    completedUrl: uploaded.completedUrl,
                    cdnUrl: uploaded.cdnUrl,
                    mime: uploaded.mime,
                    extension: uploaded.extension,
                    size: uploaded.size,
                },
            } as any);
            em.persist(skill);
        }
        await em.flush();
    }

    async remove(): Promise<void> {
        await this.em.nativeDelete(SkillEntity, { workspace: null });
    }
}
