import { MikroORM, RequestContext } from '@mikro-orm/core';
import { Injectable } from '@nestjs/common';
import { Command } from 'nestjs-command';
import { ChatbotEntity } from 'src/modules/chatbot/repository/entities/chatbot.entity';
import { ChatbotSkillService } from 'src/modules/skill/services/chatbot-skill.service';
import { SkillService } from 'src/modules/skill/services/skill.service';
import { UserEntity } from 'src/modules/user/repository/entities/user.entity';
import { WorkspaceEntity } from 'src/modules/workspace/repository/entities/workspace.entity';

// End-to-end smoke of the NEW skill service logic (clone / attach / admin CRUD)
// against the real DB + S3. Run: `npx nestjs-command smoke:skill`.
@Injectable()
export class MigrationSkillSmoke {
    constructor(
        private readonly orm: MikroORM,
        private readonly skillService: SkillService,
        private readonly chatbotSkillService: ChatbotSkillService
    ) {}

    @Command({ command: 'smoke:skill', describe: 'smoke test skill flows' })
    async run(): Promise<void> {
        // Bind a forked EM to the async context so services' injected EM
        // resolves to it (runtime config sets allowGlobalContext=false).
        await RequestContext.create(this.orm.em, () => this.exec());
    }

    private async exec(): Promise<void> {
        const log = (ok: boolean, msg: string) =>
            console.log(`${ok ? '✅ PASS' : '❌ FAIL'} — ${msg}`);

        const em = this.orm.em;
        const user = (await em.find(UserEntity, {}, { limit: 1 }))[0];
        const workspace = (await em.find(WorkspaceEntity, {}, { limit: 1 }))[0];
        const chatbot = workspace
            ? await em.findOne(ChatbotEntity, { workspace })
            : null;
        const templates = await this.skillService.findAllBuiltin(
            {},
            { limit: 1 }
        );
        const template = templates[0];
        if (!user || !workspace || !chatbot || !template) {
            console.log(
                'missing prerequisites (user/workspace/chatbot/template)'
            );
            return;
        }
        console.log(
            `ctx: ws=${workspace.id} chatbot=${chatbot.id} template=${template.slug}`
        );

        let clonedId: string | undefined;
        let builtinId: string | undefined;
        try {
            // 1. clone template -> workspace-owned skill (copies S3 + row)
            const cloned = await this.skillService.cloneFromTemplate(
                workspace.id,
                template.id,
                user
            );
            clonedId = cloned.id;
            const clonedDetail = await this.skillService.getOne(
                workspace.id,
                cloned.id
            );
            log(
                !!cloned.workspace &&
                    clonedDetail.instructions.length > 0 &&
                    cloned.s3.key !== template.s3.key,
                `clone: workspace-owned, own S3 key (${cloned.s3.key}), instructions ${clonedDetail.instructions.length} chars`
            );

            // 2. attach cloned skill to chatbot
            await this.chatbotSkillService.attach(
                workspace.id,
                chatbot.id,
                cloned.id,
                {}
            );
            const attached = await this.chatbotSkillService.listByChatbot(
                workspace.id,
                chatbot.id
            );
            log(
                attached.some(s => s.id === cloned.id && s.enabled),
                `attach: cloned skill enabled on chatbot (${attached.length} attached)`
            );

            // 3. toggle off then detach
            await this.chatbotSkillService.setEnabled(
                workspace.id,
                chatbot.id,
                cloned.id,
                false
            );
            await this.chatbotSkillService.detach(
                workspace.id,
                chatbot.id,
                cloned.id
            );
            const afterDetach = await this.chatbotSkillService.listByChatbot(
                workspace.id,
                chatbot.id
            );
            log(
                !afterDetach.some(s => s.id === cloned.id),
                'toggle+detach: cloned skill removed from chatbot'
            );

            // 4. admin builtin CRUD
            const created = await this.skillService.createBuiltin(
                {
                    name: 'Smoke Builtin',
                    instructions: '# Smoke\nHello from admin smoke.',
                    description: 'smoke',
                } as any,
                user
            );
            builtinId = created.id;
            log(!created.workspace, `admin create: builtin (${created.slug})`);

            await this.skillService.updateBuiltin(
                created.id,
                { instructions: '# Smoke v2\nUpdated.' } as any,
                user
            );
            const updated = await this.skillService.getOneBuiltin(created.id);
            log(
                updated.instructions.includes('v2'),
                'admin update: instructions overwritten on S3'
            );

            await this.skillService.softDeleteBuiltin(created.id);
            let gone = false;
            try {
                await this.skillService.getOneBuiltin(created.id);
            } catch {
                gone = true;
            }
            log(gone, 'admin delete: builtin soft-deleted');
            builtinId = undefined;
        } finally {
            if (clonedId) {
                await this.skillService
                    .softDelete(workspace.id, clonedId)
                    .catch(() => undefined);
            }
            if (builtinId) {
                await this.skillService
                    .softDeleteBuiltin(builtinId)
                    .catch(() => undefined);
            }
            console.log('cleanup done');
        }
    }
}
