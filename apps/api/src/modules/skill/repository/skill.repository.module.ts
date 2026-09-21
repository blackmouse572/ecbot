import { MikroOrmModule } from '@mikro-orm/nestjs';
import { Module } from '@nestjs/common';
import { ChatbotSkillEntity } from 'src/modules/skill/repository/entities/chatbot-skill.entity';
import { SkillEntity } from 'src/modules/skill/repository/entities/skill.entity';
import { ChatbotSkillRepository } from 'src/modules/skill/repository/repositories/chatbot-skill.repository';
import { SkillRepository } from 'src/modules/skill/repository/repositories/skill.repository';

@Module({
    providers: [SkillRepository, ChatbotSkillRepository],
    exports: [SkillRepository, ChatbotSkillRepository],
    controllers: [],
    imports: [MikroOrmModule.forFeature([SkillEntity, ChatbotSkillEntity])],
})
export class SkillRepositoryModule {}
