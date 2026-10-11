import { ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsOptional, IsUrl } from 'class-validator';
import { CreateHttpToolRequestDto } from './create-http-tool.request.dto';

/**
 * Every create field is editable (#176). `serverUrl` applies to an MCP tool;
 * `auth` and `credential` go to whichever kind the tool is.
 */
export class UpdateToolRequestDto extends PartialType(
    CreateHttpToolRequestDto
) {
    @ApiPropertyOptional({ description: 'MCP server URL (MCP tools only)' })
    @IsOptional()
    @IsUrl({
        protocols: ['http', 'https'],
        require_protocol: true,
        require_tld: false,
    })
    serverUrl?: string;
}
