import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { AgentBuilderService } from './services/agent-builder.service';
import { AiDecisionService } from './services/ai-decision.service';

@Module({
    imports: [HttpModule],
    providers: [AiDecisionService, AgentBuilderService],
    exports: [AgentBuilderService],
    controllers: [], // per project convention, controllers register in routes.{access}.module.ts
})
export class AgentBuilderModule {}
