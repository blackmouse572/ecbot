import { Body, Controller, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Response } from 'src/common/response/decorators/response.decorator';
import { IResponse } from 'src/common/response/interfaces/response.interface';
import { ApiKeySystemProtected } from 'src/modules/api-key/decorators/api-key.decorator';
import { ToolSystemExecuteDoc } from 'src/modules/tool/docs/tool.system.doc';
import { ExecuteToolRequestDto } from 'src/modules/tool/dtos/request/execute-tool.request.dto';
import {
    ExecuteOutcome,
    ToolExecutionService,
} from 'src/modules/tool/services/tool-execution.service';

@ApiTags('modules.system.tool')
@Controller({
    version: '1',
    path: '/internal/tool',
})
export class ToolSystemController {
    constructor(private readonly toolExecutionService: ToolExecutionService) {}

    @ToolSystemExecuteDoc()
    @Response('tool.execute.success')
    @ApiKeySystemProtected()
    @Post('/execute')
    async execute(
        @Body() dto: ExecuteToolRequestDto
    ): Promise<IResponse<ExecuteOutcome>> {
        const result = await this.toolExecutionService.execute(dto);
        return { data: result };
    }
}
