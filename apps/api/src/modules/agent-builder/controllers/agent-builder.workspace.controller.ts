import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Response } from 'src/common/response/decorators/response.decorator';
import { IResponse } from 'src/common/response/interfaces/response.interface';
import { ApiKeyProtected } from 'src/modules/api-key/decorators/api-key.decorator';
import { AuthJwtAccessProtected } from 'src/modules/auth/decorators/auth.jwt.decorator';
import { ENUM_POLICY_ACTION, ENUM_POLICY_SUBJECT } from 'src/modules/policy/enums/policy.enum';
import { UserProtected } from 'src/modules/user/decorators/user.decorator';
import { WorkspacePolicyAbilityProtected } from 'src/modules/workspace/decorators/workspace.decorator';
import { AgentBuilderWorkspaceSuggestDoc } from '../docs/agent-builder.workspace.doc';
import { AgentBuilderSuggestRequestDto } from '../dtos/request/agent-builder.suggest.request.dto';
import { AgentBuilderSuggestResponseDto } from '../dtos/response/agent-builder.suggest.response.dto';
import { AgentBuilderService } from '../services/agent-builder.service';

@ApiTags('modules.workspace.agentBuilder')
@Controller({ version: '1', path: '/:workspace/agent-builder' })
export class AgentBuilderWorkspaceController {
    constructor(private readonly agentBuilderService: AgentBuilderService) {}

    @AgentBuilderWorkspaceSuggestDoc()
    @Response('agentBuilder.suggest.success')
    @WorkspacePolicyAbilityProtected({
        subject: ENUM_POLICY_SUBJECT.CHATBOT,
        action: [ENUM_POLICY_ACTION.CREATE],
    })
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @HttpCode(HttpStatus.OK)
    @Post('/suggest')
    async suggest(
        @Body() { description }: AgentBuilderSuggestRequestDto
    ): Promise<IResponse<AgentBuilderSuggestResponseDto>> {
        return { data: await this.agentBuilderService.suggest(description) };
    }
}
