import { Module } from '@nestjs/common';
import { AiCacheModule } from 'src/modules/ai-cache/ai-cache.module';
import { AwsModule } from 'src/modules/aws/aws.module';
import { SkillRepositoryModule } from 'src/modules/skill/repository/skill.repository.module';
import { ChatbotSkillService } from 'src/modules/skill/services/chatbot-skill.service';
import { SkillService } from 'src/modules/skill/services/skill.service';
import { ToolModule } from 'src/modules/tool/tool.module';

@Module({
    imports: [SkillRepositoryModule, AwsModule, AiCacheModule, ToolModule],
    providers: [SkillService, ChatbotSkillService],
    exports: [SkillService, ChatbotSkillService],
    controllers: [], // per project convention — controllers register in routes.{access}.module.ts
})
export class SkillModule {}
